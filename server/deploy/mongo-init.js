db.getSiblingDB("app_center").createUser({
    user: "app_center",
    pwd: require("fs").readFileSync("/auth/app-center", "utf8").trim(),
    roles: [{ role: "readWrite", db: "app_center" }],
});
