// 启动入口复用此脚本，为已有数据卷补齐新节点使用的账号。
const admin = db.getSiblingDB("admin");
const password = require("fs").readFileSync("/data/db/.bootstrap-password", "utf8").trim();
if (!admin.auth("bootstrap", password).ok) throw Error("MongoDB 管理员认证失败");

for (const prefix of ["APP_CENTER_MONGO_", "APP_MONGO_"]) {
    const database = process.env[prefix + "DATABASE"];
    const user = process.env[prefix + "USERNAME"];
    const pwd = process.env[prefix + "PASSWORD"];
    if (!pwd) throw Error(prefix + "PASSWORD 未配置");
    const auth = db.getSiblingDB(process.env[prefix + "AUTH_DB"]);
    if (!auth.getUser(user)) {
        auth.createUser({ user, pwd, roles: [{ role: "readWrite", db: database }] });
    }
}
