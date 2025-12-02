# 示例任务与预期输出（Version: 0.1）

1. **诊断 NaN 扩散**
   - 输入：捕获路径 + 指定 render target resourceId。
   - Planner：`iterate_actions` → `pixel_history` → `save_texture`（原始/法线/深度）。
   - Explainer：识别首次出现 NaN 的 eventId，建议在 shader 中加入 finite 检查。

2. **性能瓶颈分析**
   - 输入：捕获路径。
   - Planner：`enumerate_counters` → 按 drawcall 分析 action 列表，定位高延迟事件。
   - Explainer：结合计数器结果与 drawcall 名称输出优化建议（批次合并、减少 overdraw）。

3. **几何缺失/爆炸**
   - 输入：用户描述缺失的 mesh。
   - Planner：查找相关 drawcall，导出对应纹理或执行 pixel history，必要时请求用户提供 camera 参数。
   - Explainer：推断是否因为 frustum culling、索引错误或 NaN 导致的顶点爆炸。
