# 编码与文本处理协议（Windows PowerShell）

## 背景
在 Windows PowerShell 中通过管道把脚本/文本喂给外部程序（例如 `@'... '@ | python -`）可能按当前 code page 转码，导致中文被替换成 `?`。

## 规则
- 批量修改文档时必须显式使用 UTF-8 读写：
  - Python：`open(..., encoding='utf-8')`
  - PowerShell：`Set-Content -Encoding utf8` / `Out-File -Encoding utf8`
- 避免用不受控的管道写回文件（尤其是含中文的 markdown）。

