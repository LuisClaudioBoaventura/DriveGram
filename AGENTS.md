# Diretrizes e Regras do Projeto DriveGram

## 1. Regra de Branches (Git Workflow)
Sempre que formos realizar qualquer alteração, correção ou nova funcionalidade no projeto:
1. **Nunca realizar alterações diretamente na branch `main`**.
2. **Criar uma nova branch** a partir da `main` atualizada antes de iniciar o desenvolvimento:
   - `feature/<nome-da-funcionalidade>` para novos recursos.
   - `fix/<nome-do-bug>` para correções de problemas/bugs.
   - `refactor/<nome-do-ajuste>` ou `chore/...` para melhorias de código, dependências ou infraestrutura.
3. Ao concluir e validar as alterações com sucesso, a branch deve ser mergeada na `main` (ou deixada pronta via Pull Request / Merge conforme o fluxo solicitado).

---

## 2. Regra de Versionamento dos Aplicativos (SemVer)

O projeto adota o padrão **SemVer (Semantic Versioning 2.0.0)** no formato:
`MAJOR.MINOR.PATCH` (exemplo: `1.4.0`)

### Como decidir o próximo número de versão?

| Tipo de Mudança | Exemplo Atual | Próxima Versão | Quando Usar |
| :--- | :--- | :--- | :--- |
| **PATCH** (Correção) | `1.4.0` | **`1.4.1`** | **Bugs, pequenos ajustes e correções.** Correções de falhas, melhorias de desempenho internas, ajustes de layout pontuais ou correções de segurança sem quebrar nada e sem adicionar recursos novos de grande porte. |
| **MINOR** (Nova Feature) | `1.4.0` | **`1.5.0`** | **Novas funcionalidades.** Adiciona uma nova funcionalidade, nova tela, novo suporte a ferramentas ou fluxo novo, mantendo compatibilidade com o que já existia. Quando o MINOR sobe, o PATCH volta a 0. |
| **MAJOR** (Mudança Estrutural) | `1.4.0` | **`2.0.0`** | **Grandes transformações ou Breaking Changes.** Mudança profunda de arquitetura, redesign completo ou quando funcionalidades antigas deixam de funcionar/são substituídas de forma incompatível. Quando o MAJOR sobe, MINOR e PATCH voltam a 0. |

> **Regra prática**:
> - Se você só corrigiu um erro ou fez um ajuste fino: de `1.4.0` vai para **`1.4.1`**.
> - Se você adicionou uma funcionalidade nova ou página nova: de `1.4.0` pula para **`1.5.0`**.

---

## 3. Arquivos Obrigatórios a Sincronizar na Alteração de Versão

Toda vez que a versão for incrementada, ela deve ser atualizada em **todos** os seguintes arquivos:

1. **`package.json`**:
   - Atualizar o campo `"version": "x.y.z"`.
2. **`src-tauri/tauri.conf.json`**:
   - Atualizar o campo `"version": "x.y.z"`.
3. **`android/app/build.gradle`**:
   - Atualizar `versionName "x.y.z"`.
   - **Incrementar obrigatoriamente** o `versionCode` inteiro (ex: de `14` para `15`), pois o Android e lojas de apps exigem que o `versionCode` seja sempre maior a cada build.
4. **`src/utils/updater.ts`**:
   - Atualizar a constante: `export const CURRENT_APP_VERSION = 'x.y.z';` (usada pelo sistema de atualização automática do app).
5. **`server/index.ts`**:
   - Atualizar o campo `version: 'x.y.z'` nas respostas de status/versão da API.
