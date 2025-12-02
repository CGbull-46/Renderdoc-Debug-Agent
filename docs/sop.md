# 调试 SOP 与 Prompt 注入（Version: 0.1）

## 通用调试步骤
1. **加载捕获**：Planner 先调用 `iterate_actions` 确认 drawcall 结构与可能的关键事件。
2. **锁定疑点**：结合用户描述和 action 列表选择 eventId，必要时导出相关纹理。
3. **证据收集**：
   - `pixel_history` 验证像素异常（NaN/Inf/颜色跳变）。
   - `enumerate_counters` 查看 GPU 性能瓶颈或异常计数。
   - `save_texture` 导出供多模态模型分析。
4. **推理与解释**：Explainer 对证据进行因果推断，生成修复建议（修改 shader、校验 RT 格式、检查绑定）。
5. **验证回路**：如果结论不稳固，Planner 追加新工具调用（如不同 mip/slice 的纹理导出）。

## Prompt 注入建议
- **Planner**：强调“先证据后结论”，引用 `docs/api_spec.md` 中的 schema；要求输出 `{name, arguments}` 的数组。
- **Explainer**：提供工具调用结果和导出图片路径，要求输出可读报告与下一步行动建议。

## 多模态指引
- 导出的 PNG/EXR 可作为图片输入给多模态模型，配合 `pixel_history` 数值形成混合证据。
- 请在回复中标注 eventId、纹理资源 ID，便于回溯。
