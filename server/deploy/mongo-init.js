// 启动入口复用此脚本，为已有数据卷补齐新节点使用的账号。
const admin = db.getSiblingDB("admin");
const password = require("fs").readFileSync("/data/db/.bootstrap-password", "utf8").trim();
if (!admin.auth("bootstrap", password).ok) throw Error("MongoDB 管理员认证失败");

const env = process.env;
const protectedDatabases = [env.APP_CENTER_MONGO_DATABASE, env.GATEWAY_MONGO_DATABASE, env.LEGACY_MONGO_DATABASE,
    "admin", "config", "local", "app_credentials"];
if (new Set(protectedDatabases).size !== protectedDatabases.length ||
    protectedDatabases.some(name => /^app_[a-f0-9]{32}$/.test(name))) throw Error("基础数据库名称冲突");

const accounts = new Set(["admin/bootstrap", "admin/app_provisioner"]);
for (const prefix of ["APP_CENTER_MONGO_", "GATEWAY_MONGO_", "LEGACY_MONGO_"]) {
    const source = env[prefix + "AUTH_DB"];
    const identity = source + "/" + env[prefix + "USERNAME"];
    if (accounts.has(identity) || source === "app_credentials") throw Error(prefix + "账号冲突");
    accounts.add(identity);
}
for (const prefix of ["APP_CENTER_MONGO_", "GATEWAY_MONGO_"]) {
    const database = env[prefix + "DATABASE"];
    const user = env[prefix + "USERNAME"];
    const pwd = env[prefix + "PASSWORD"];
    if (!pwd) throw Error(prefix + "PASSWORD 未配置");
    const auth = db.getSiblingDB(env[prefix + "AUTH_DB"]);
    const existing = auth.getUser(user);
    if (!existing) {
        auth.createUser({ user, pwd, roles: [{ role: "readWrite", db: database }] });
    } else if (existing.roles.length !== 1 || existing.roles[0].role !== "readWrite" || existing.roles[0].db !== database) {
        throw Error(prefix + "账号权限与配置不一致");
    }
}

const role = "app_database_accounts";
const privileges = [
    { resource: { db: "app_credentials", collection: "" }, actions: ["createUser", "dropUser", "viewUser"] },
    { resource: { db: env.LEGACY_MONGO_AUTH_DB, collection: "" }, actions: ["dropUser", "viewUser"] },
    { resource: { db: "", collection: "" }, actions: ["grantRole"] },
];
if (admin.getRole(role)) admin.updateRole(role, { privileges, roles: [] });
else admin.createRole({ role, privileges, roles: [] });
if (!admin.getUser("app_provisioner")) {
    admin.createUser({ user: "app_provisioner", pwd: env.APP_CENTER_MONGO_PROVISION_PASSWORD, roles: [role] });
}
