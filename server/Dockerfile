FROM debian:13 AS build
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libssl-dev libreadline-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/skynet/server
COPY common/native ../common/native
COPY server/makefile ./makefile
COPY server/3rd ./3rd
COPY server/src/service/app/agent/native ./src/service/app/agent/native
RUN make linux MALLOC_STATICLIB= SKYNET_DEFINES=-DNOUSE_JEMALLOC
COPY server/deploy/workspace_sandbox.c /tmp/workspace_sandbox.c
RUN cc -O2 -Wall -Wextra -Werror /tmp/workspace_sandbox.c -o /tmp/workspace-sandbox

FROM debian:13 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends libssl3t64 ca-certificates netcat-openbsd && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/skynet/server
COPY --from=build /opt/skynet/server/3rd/skynet/skynet ./3rd/skynet/skynet
COPY --from=build /opt/skynet/server/3rd/skynet/cservice ./3rd/skynet/cservice
COPY --from=build /opt/skynet/server/3rd/skynet/luaclib ./3rd/skynet/luaclib
COPY --from=build /opt/skynet/server/luaclib ./luaclib
COPY server/3rd/skynet/lualib ./3rd/skynet/lualib
COPY server/3rd/skynet/service ./3rd/skynet/service
COPY server/3rd/lua-protobuf/*.lua ./3rd/lua-protobuf/
COPY common/enum ../common/enum
COPY server/etc ./etc
COPY server/src/lualib ./src/lualib
COPY server/src/clusteragent.lua ./src/
COPY server/src/service/database ./src/service/database
COPY server/src/service/init.lua ./src/service/init.lua
ENTRYPOINT ["./3rd/skynet/skynet"]

FROM runtime AS app-center
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
COPY common/proto/common.proto ../common/proto/
COPY common/proto/app_center ../common/proto/app_center
RUN --mount=type=bind,from=build,source=/opt/skynet/server/3rd/skynet/3rd/lua/lua,target=/tmp/lua \
    --mount=type=bind,source=server/deploy/check_protocol.lua,target=/tmp/check_protocol.lua \
    /tmp/lua /tmp/check_protocol.lua app-center app_center/schema.proto
COPY server/src/center_main.lua server/src/submit_app.lua ./src/
COPY server/src/service/app/app_center ./src/service/app/app_center
COPY server/deploy/container.py ./deploy/
CMD ["etc/config.center"]

FROM runtime AS gateway
COPY common/proto/common.proto common/proto/login.proto ../common/proto/
RUN --mount=type=bind,from=build,source=/opt/skynet/server/3rd/skynet/3rd/lua/lua,target=/tmp/lua \
    --mount=type=bind,source=server/deploy/check_protocol.lua,target=/tmp/check_protocol.lua \
    /tmp/lua /tmp/check_protocol.lua login login.proto
COPY server/src/main.lua ./src/
COPY server/src/service/app_routes ./src/service/app_routes
COPY server/src/service/gateway ./src/service/gateway
COPY server/src/service/logind ./src/service/logind
COPY server/src/service/client ./src/service/client
COPY server/src/service/websocket ./src/service/websocket
CMD ["etc/config"]

FROM runtime AS app
COPY server/src/app_main.lua ./src/
COPY server/src/service/app_endpoint ./src/service/app_endpoint
COPY --from=build /opt/skynet/server/3rd/skynet/3rd/lua/lua ./bin/lua
COPY server/deploy/check_protocol.lua ./deploy/check_protocol.lua
CMD ["etc/config.app"]

FROM app AS agent
ENV APP_SCHEMA=agent/schema.proto AGENT_WORKSPACE_ROOT=/work AGENT_SANDBOX_BACKEND=landlock
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/* \
    && install -d -o 65532 -g 65532 /work
COPY --from=build /tmp/workspace-sandbox /usr/local/libexec/workspace-sandbox
COPY --from=build /opt/skynet/server/bin ./bin
COPY server/3rd/lua-openai ./3rd/lua-openai
COPY server/3rd/tableshape ./3rd/tableshape
COPY common/proto/common.proto ../common/proto/
COPY common/proto/agent ../common/proto/agent
COPY server/src/service/app/agent ./src/service/app/agent
RUN bin/lua deploy/check_protocol.lua agent agent/schema.proto
USER 65532:65532

FROM app AS echo-fixture
ENV APP_SCHEMA=echo.proto APP_INSTANCES=1
COPY server/tests/fixtures/echo/echo.proto ../common/proto/
COPY server/tests/fixtures/echo/init.lua ./src/service/app/echo/init.lua
RUN bin/lua deploy/check_protocol.lua echo echo.proto
