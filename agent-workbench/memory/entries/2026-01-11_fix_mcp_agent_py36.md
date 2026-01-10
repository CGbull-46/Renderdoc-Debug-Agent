# 2026-01-11 修复 MCP Agent 在 Python 3.6 下的启动与依赖问题

## 问题
- start_debug_agent.bat 启动后 MCP Agent 窗口报错：pip 缺失、websockets 安装失败、runtime.agent 无法加载、asyncio.run 不存在。
- 运行环境使用内置 Python 3.6（RenderDoc bindings 依赖 python36.dll）。

## 根因
- start_mcp_agent.cmd 在括号块内设置变量后用 %VAR% 读取，未开启 delayed expansion，导致 PY_HOME/PTH_FILE/依赖路径计算失效。
- embeddable Python 需要 _pth 开启 import site + site-packages，且需显式加入仓库根目录；否则 runtime 包不可见。
- Python 3.6 不支持 from __future__ import annotations、dataclasses 内置模块与 asyncio.run。

## 修复
- start_mcp_agent.cmd：启用 delayed expansion，修正 PY_HOME/PTH/PATH 计算；在 _pth 中补充 `..\..` 仓库根路径；依赖安装逻辑合并为通用模块（websockets + dataclasses），系统 pip 回退可用且版本兼容。
- runtime/agent：移除 __future__ annotations；补充 Python 3.6 兼容（dataclasses 依赖、asyncio.run 回退，覆盖 runtime.py/mcp_server.py/orchestrator_minimal.py）；修正 renderdoc_adapter 的 list[str] 注解。
- 运行时依赖：自动安装 websockets（3.6 走 9.1）与 dataclasses==0.8。

## 验证
- 命令：`cmd /c "set MCP_PORT=8766&& runtime\agent\start_mcp_agent.cmd"`
- 结果：依赖检查完成后进入 `[INFO] Starting MCP Agent...`，进程保持运行（超时终止用于非交互验证）。

## 影响/回滚
- 影响：`thirdparty/python/python36._pth` 被更新；`thirdparty/python/Lib/site-packages` 增加 websockets、dataclasses。
- 回滚：还原 `runtime/agent/start_mcp_agent.cmd`、`runtime/agent/runtime.py`、`runtime/agent/mcp_server.py`、`runtime/agent/orchestrator_minimal.py`、`runtime/agent/renderdoc_adapter.py` 与移除 __future__ import 的改动；恢复 `thirdparty/python/python36._pth` 与 site-packages 变更。
