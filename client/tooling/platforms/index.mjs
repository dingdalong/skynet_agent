import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const clientRoot = fileURLToPath(new URL("../../", import.meta.url));
export const platforms = {
    macos: {
        status: "supported",
        host: "darwin",
        renderer: "react-native-macos",
        detail: "本机 ad-hoc App；正式签名与公证未接入",
    },
    ios: {
        status: "planned",
        host: "darwin",
        renderer: "react-native",
        detail: "共享 RN 界面可独立打包验证；UIKit 宿主与运行时未接入",
    },
    android: {
        status: "planned",
        renderer: "react-native",
        detail: "共享 RN 界面可独立打包验证；Android 宿主与运行时未接入",
    },
    windows: {
        status: "planned",
        host: "win32",
        renderer: "react-native-windows",
        detail: "需选择受支持版本并验证原生桥；没有 Windows 原生构建证据",
    },
    linux: {
        status: "blocked",
        host: "linux",
        renderer: null,
        detail: "公共 C++ 核心可验证；尚无已选定且兼容当前 RN 的生产级宿主",
    },
    web: {
        status: "planned",
        renderer: "react-native-web",
        detail: "浏览器宿主、传输与资源适配未接入",
    },
};

export function defaultPlatform(host = process.platform) {
    return { darwin: "macos", win32: "windows", linux: "linux" }[host];
}

export function requireBuildPlatform(name, host = process.platform) {
    const target = platforms[name];
    if (!target)
        throw new Error(`未知平台 ${name}；可查询 make client-platforms`);
    if (target.status !== "supported")
        throw new Error(`${name} 尚不可构建：${target.detail}`);
    if (target.host && target.host !== host)
        throw new Error(`${name} 需要 ${target.host} 构建环境，当前为 ${host}`);
    return target;
}

export async function installedVersions() {
    const manifest = JSON.parse(
        await readFile(`${clientRoot}package.json`, "utf8"),
    );
    return Object.fromEntries(
        ["react", "react-native", "react-native-macos"].map((name) => [
            name,
            manifest.dependencies[name],
        ]),
    );
}
