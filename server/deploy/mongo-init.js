// 启动入口复用此脚本，为已有数据卷补齐新节点使用的账号。
const admin = db.getSiblingDB("admin");
const env = process.env;
if (!admin.auth("bootstrap", env.MONGO_INITDB_ROOT_PASSWORD).ok) throw Error("MongoDB 管理员认证失败");

const database = env.APP_CENTER_MONGO_DATABASE;
const source = env.APP_CENTER_MONGO_AUTH_DB;
const user = env.APP_CENTER_MONGO_USERNAME;
if (["admin", "config", "local", "app_credentials"].includes(database) || /^app_[a-f0-9]{32}$/.test(database))
    throw Error("基础数据库名称冲突");
if (source === "app_credentials" || (source === "admin" && ["bootstrap", "app_provisioner"].includes(user)))
    throw Error("App Center 数据库账号冲突");
const pwd = env.APP_CENTER_MONGO_PASSWORD;
if (!pwd) throw Error("APP_CENTER_MONGO_PASSWORD 未配置");
const auth = db.getSiblingDB(source);
const existing = auth.getUser(user);
if (!existing) {
    auth.createUser({ user, pwd, roles: [{ role: "readWrite", db: database }] });
} else if (existing.roles.length !== 1 || existing.roles[0].role !== "readWrite" || existing.roles[0].db !== database) {
    throw Error("App Center 账号权限与配置不一致");
}

const role = "app_database_accounts";
const privileges = [
    { resource: { db: "app_credentials", collection: "" }, actions: ["createUser", "dropUser", "viewUser"] },
    { resource: { db: "", collection: "" }, actions: ["grantRole"] },
];
if (admin.getRole(role)) admin.updateRole(role, { privileges, roles: [] });
else admin.createRole({ role, privileges, roles: [] });
if (!admin.getUser("app_provisioner")) {
    admin.createUser({ user: "app_provisioner", pwd: env.APP_CENTER_MONGO_PROVISION_PASSWORD, roles: [role] });
}
