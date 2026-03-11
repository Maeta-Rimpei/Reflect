# Reflect 分析設計

## 目的

日々の記録から「感情・思考・行動の傾向」を観察し、  
長期的に「自分という構造」を理解できるようにする。

### 基本方針

- 評価しない  
- 励まさない  
- アドバイスしない  
- **観察された傾向のみ記述する**

それぞれの役割は以下。

| レイヤー | 役割 |
|---|---|
| 日次 | 観察 |
| 週次 | 状態 |
| 月次 | パターン |
| 年次 | 長期傾向 |
| 人格サマリ | 解釈 |

---

## 1. 日次分析（Daily Analysis）

### 役割
その日の **感情と思考を観察する**

入力


## 1️⃣ 週次分析（Weekly Analysis）

### 目的

短期的な状態の可視化  
「今週の自分」を客観視する

---

### 出力項目

```json
{
  "emotionDistribution": [],
  "thoughtPatterns": [],
  "stressTriggers": [],
  "notableContradictions": [],
  "weeklyInsight": ""
}


```
### 各項目の解説

- emotionDistribution
    - 今週多く見られた感情

例
```json
["焦り", "期待", "疲労"]
```

- thoughtPatterns
    - 観察された思考の傾向

例
```
完璧主義傾向

不安先読み傾向

他者評価への敏感さ
```

- stressTriggers
    - ストレスのきっかけ

例
>仕事の締切  
>人間関係  
>予定過多

notableContradictions

- 行動や思考の矛盾

例
>休みたいと言いつつ予定を増やしている

- weeklyInsight
    - 今週の観察結果（2〜3文）

例
>今週は焦りと期待が混在している。  
>新しい挑戦が増える一方で、評価への意識が強くなっている。

### プロンプト
```
あなたはユーザーの日次分析サマリを読む分析アシスタントである。

出力は「傾向」と「パターン」に基づく冷静な分析に限定する。
占い・スピリチュアル・ポエム・励まし・助言は禁止。

対象期間: ${periodFrom} 〜 ${periodTo}（週次）

【入力データ】
${inputSummary}

上記データから1週間の傾向を分析し、以下のJSON形式で出力する。

- emotionDistribution: 今週多く見られた感情を配列（最大3件）
- thoughtPatterns: 思考の傾向を短文で配列（3〜5件）
- stressTriggers: ストレスのきっかけを配列（最大5件）
- notableContradictions: 行動や思考の矛盾を配列（最大3件）
- weeklyInsight: 今週の傾向を2〜3文で要約

JSONのみ出力する。
```


## 2️⃣ 月次分析（Monthly Analysis）
### 目的
繰り返されるパターンの可視化
「自分の思考と行動の構造」を見つける

### 出力項目
```json
{
  "dominantEmotions": [],
  "recurringThoughtPatterns": [],
  "behaviorPatterns": [],
  "stressSourcesRanking": [],
  "monthlyInsight": ""
}
```

### 各項目の解説
- dominantEmotions
    - 月全体で目立った感情

- recurringThoughtPatterns
    - 繰り返し現れる思考傾向

例
>他者評価への意識  
>完璧主義  
>将来不安

- behaviorPatterns
    - 行動パターン

例
>忙しくなると自己否定が増える  
>新しい挑戦があるとエネルギーが上がる

stressSourcesRanking

ストレス源ランキング

例
```json
[
  "仕事量",
  "人間関係",
  "将来不安"
]
```

- monthlyInsight
    - 月全体の洞察（3〜4文）

```
あなたはユーザーの週次分析サマリを読む分析アシスタントである。

出力は「傾向」と「パターン」に基づく冷静な分析に限定する。
占い・スピリチュアル・ポエム・励まし・助言は禁止。

対象期間: ${periodFrom} 〜 ${periodTo}（月次）

【入力データ】
${inputSummary}

上記データから1ヶ月の傾向を分析し、以下のJSON形式で出力する。

- dominantEmotions: 月全体で目立った感情を配列（最大3件）
- recurringThoughtPatterns: 繰り返し現れる思考傾向を配列（3〜5件）
- behaviorPatterns: 観察された行動パターンを配列（3〜5件）
- stressSourcesRanking: ストレス源をランキング形式で配列（最大5件）
- monthlyInsight: 月全体の傾向を3〜4文で要約

JSONのみ出力する。
```

## 3️⃣ 年次分析（Yearly Analysis）
### 目的
繰り返されるパターンを見つける

- 思考傾向
- 感情の推移
- 動機

出力例
```json
{
  "coreThoughtPatterns": [],
  "emotionTrend": "",
  "stressSourcesRanking": [],
  "motivationDrivers": [],
  "identityTraits": []
}
```

### 各項目の解説
- coreThoughtPatterns
    - 年間の思考傾向

例
>完璧主義  
>自己評価の厳しさ  
>成長志向

- emotionTrend
    - 感情の推移

例
> 前半は焦りが目立ち、後半は安定傾向。

- stressSourcesRanking
    - 年間のストレス源


- motivationDrivers
    - 行動の動機

例
>成長欲求  
>承認欲求  
>安定志向  
>好奇心

- identityTraits
    - 観察された特性

```json
[
  "内省型",
  "挑戦志向",
  "慎重型",
  "分析志向"
]
```

## 人格サマリ（Personality Summary）
### 目的
その人の取扱説明書
年次分析を元に
- 傾向
- 強み
- 弱み
- リスク
- 回復方法


をまとめる。

出力例
```json
{
  "tendency": "",
  "strengthSignals": [],
  "riskPatterns": [],
  "downTriggers": "",
  "recoveryActions": ""
}
```

### 各項目の解説
- tendency
    - その人の傾向まとめ（3〜5文）

- strengthSignals
    - 観察された強み

例
```json
[
  "内省力",
  "継続力",
  "分析思考"
]
```

- riskPatterns
    - 注意すべき思考パターン

例
```json
[
  "自己評価の厳しさ",
  "完璧主義"
]
```

- downTriggers
    - 落ち込みやすい条件

- recoveryActions
    - 回復しやすい行動