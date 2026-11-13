import CoreFoundation
import Foundation

public struct HostError: Error, CustomStringConvertible {
    public let code: String
    public let description: String
    public init(_ code: String, _ description: String) {
        self.code = code
        self.description = description
    }
}

func failure(_ code: String, _ message: String) -> HostError { HostError(code, message) }

func jsonData(_ value: Any) throws -> Data {
    try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys, .fragmentsAllowed])
}

func jsonObject(_ data: Data) throws -> [String: Any] {
    guard let value = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        throw failure("invalid", "Expected a JSON object")
    }
    return value
}

func dictionary(_ value: Any?) -> [String: Any] { value as? [String: Any] ?? [:] }

/// The supported JSON Schema subset is deliberately closed. Unknown schema
/// keywords are rejected at install time rather than silently ignored.
public enum Schema {
    static let keywords: Set<String> = [
        "type", "properties", "required", "additionalProperties", "items",
        "enum", "minimum", "maximum", "minLength", "maxLength", "maxItems",
    ]

    public static func check(_ schema: [String: Any], depth: Int = 0) throws {
        guard depth < 16, Set(schema.keys).isSubset(of: keywords),
            let type = schema["type"] as? String,
            ["object", "array", "string", "number", "integer", "boolean", "null"].contains(type)
        else {
            throw failure("schema", "Unsupported action schema")
        }
        let objectKeys: Set<String> = ["properties", "required", "additionalProperties"]
        guard type == "object" || Set(schema.keys).isDisjoint(with: objectKeys),
            type == "array" || schema["items"] == nil && schema["maxItems"] == nil,
            type == "string" || schema["minLength"] == nil && schema["maxLength"] == nil,
            ["number", "integer"].contains(type) || schema["minimum"] == nil && schema["maximum"] == nil
        else {
            throw failure("schema", "Schema keyword does not apply to its type")
        }
        if type == "object" {
            guard let additional = schema["additionalProperties"] as? NSNumber,
                CFGetTypeID(additional) == CFBooleanGetTypeID(), !additional.boolValue,
                schema["properties"] == nil || schema["properties"] is [String: Any],
                schema["required"] == nil || schema["required"] is [String]
            else {
                throw failure("schema", "Objects must declare valid properties and forbid additional fields")
            }
            let properties = dictionary(schema["properties"])
            let required = schema["required"] as? [String] ?? []
            guard properties.count <= 64, properties.keys.allSatisfy({ !$0.isEmpty && $0.count <= 128 }),
                required.count == Set(required).count, Set(required).isSubset(of: Set(properties.keys))
            else {
                throw failure("schema", "Invalid required properties")
            }
            for child in properties.values {
                guard let child = child as? [String: Any] else { throw failure("schema", "Invalid property") }
                try check(child, depth: depth + 1)
            }
        }
        if type == "array" {
            guard let child = schema["items"] as? [String: Any] else {
                throw failure("schema", "Array items required")
            }
            try check(child, depth: depth + 1)
        }
        for (key, limit) in [("minLength", 65_536), ("maxLength", 65_536), ("maxItems", 1024)] {
            guard let value = schema[key] else { continue }
            guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
                number.doubleValue.rounded() == number.doubleValue,
                (0...Double(limit)).contains(number.doubleValue)
            else {
                throw failure("schema", "Invalid \(key) bound")
            }
        }
        for key in ["minimum", "maximum"] {
            guard let value = schema[key] else { continue }
            guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(),
                number.doubleValue.isFinite
            else { throw failure("schema", "Invalid numeric bound") }
        }
        guard (schema["minLength"] as? Int ?? 0) <= (schema["maxLength"] as? Int ?? 65_536),
            (schema["minimum"] as? Double ?? -.infinity) <= (schema["maximum"] as? Double ?? .infinity)
        else {
            throw failure("schema", "Reversed schema bounds")
        }
        if let value = schema["enum"] {
            guard let choices = value as? [Any], !choices.isEmpty, choices.count <= 64 else {
                throw failure("schema", "Invalid enum")
            }
            var base = schema
            base["enum"] = nil
            for choice in choices { try validate(choice, against: base, depth: depth) }
        }
    }

    public static func validate(_ value: Any, against schema: [String: Any], depth: Int = 0) throws {
        guard depth < 16 else { throw failure("schema", "Value too deep") }
        let type = schema["type"] as? String
        let number = value as? NSNumber
        let isBoolean = number.map { CFGetTypeID($0) == CFBooleanGetTypeID() } ?? false
        switch type {
        case "object":
            guard let object = value as? [String: Any] else { throw failure("input", "Expected object") }
            let properties = dictionary(schema["properties"])
            let required = schema["required"] as? [String] ?? []
            guard required.allSatisfy({ object[$0] != nil }),
                Set(object.keys).isSubset(of: Set(properties.keys))
            else {
                throw failure("input", "Missing or unknown action fields")
            }
            for (key, item) in object {
                try validate(item, against: dictionary(properties[key]), depth: depth + 1)
            }
        case "array":
            guard let array = value as? [Any], array.count <= (schema["maxItems"] as? Int ?? 1024) else {
                throw failure("input", "Expected a bounded array")
            }
            for item in array { try validate(item, against: dictionary(schema["items"]), depth: depth + 1) }
        case "string":
            guard let string = value as? String,
                string.count >= (schema["minLength"] as? Int ?? 0),
                string.count <= (schema["maxLength"] as? Int ?? 65_536)
            else {
                throw failure("input", "Invalid string")
            }
        case "number", "integer":
            guard let number, !isBoolean, number.doubleValue.isFinite,
                type != "integer" || number.doubleValue.rounded() == number.doubleValue,
                number.doubleValue >= (schema["minimum"] as? Double ?? -.infinity),
                number.doubleValue <= (schema["maximum"] as? Double ?? .infinity)
            else {
                throw failure("input", "Invalid number")
            }
        case "boolean":
            guard isBoolean else { throw failure("input", "Expected boolean") }
        case "null":
            guard value is NSNull else { throw failure("input", "Expected null") }
        default: throw failure("schema", "Unknown type")
        }
        if let choices = schema["enum"] as? [Any] {
            let data = try jsonData(value)
            guard try choices.contains(where: { try jsonData($0) == data }) else {
                throw failure("input", "Value outside enum")
            }
        }
    }
}
