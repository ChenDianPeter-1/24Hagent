# 24Hagent Starter

把这个文件夹复制到你的项目里，运行一条命令，24Hagent 就装好了。

## 前提

- Node.js >= 20（只需要 Node 运行时，不需要 npm install）
- 你的项目有 `package.json` 或 `pyproject.toml`
- 你的项目里有测试/lint/类型检查/覆盖率工具（pytest/vitest 等）

## 3 步安装

```bash
# 1. 复制 starter 到你的项目
cp -r 24hagent-starter/ /path/to/your-project/

# 2. 进入你的项目，运行 setup
cd /path/to/your-project
powershell -ExecutionPolicy Bypass -File 24hagent-starter/setup.ps1   # Windows
bash 24hagent-starter/setup.sh                                         # macOS/Linux

# 3. 看到 Verdict: **READY** 就成功了
```

setup 脚本会自动：
- 检测你的项目是 Node 还是 Python
- 创建 `.agent/` 目录 + 质量门配置
- 复制审查标准模板
- 运行就绪检查

## Python 项目

setup 会自动配置 pytest + ruff + mypy + pytest-cov 作为默认工具链。
覆盖率阈值：lines=100%, statements=100%。branches 和 functions 对 Python 项目自动设为 null（coverage.py 不提供）。

## 之后

1. 编辑 `.agent/PROJECT_BLUEPRINT.md` 写你的项目目标
2. 把 `START_ORCHESTRATOR.md` 里的提示词复制到 Claude Code
3. Orchestrator 开始自动循环：拆任务 → TDD 实现 → 跑质量门 → Codex 审查
4. 只在出现 `HUMAN_HANDOFF.md` 时你需要介入

## 不需要的可以删

- `24hagent-starter/` 文件夹（装完即可删）
- `24hagent-starter/bin/` 里的 CLI 已内置全部依赖，不依赖你的项目的 node_modules
