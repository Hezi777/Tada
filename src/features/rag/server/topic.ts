import { DATASET_TOPICS, type DatasetTopic } from "@/shared/contracts";
import {
  cosineSimilarity,
  embedQuery,
  embedTexts,
} from "@/shared/lib/ai/embeddings";

// Embedding-based topic detection: the dataset's profile summary is embedded
// and compared against descriptor vectors for each known topic. Below the
// confidence floor we stay on "unknown" rather than guess.

const TOPIC_DESCRIPTORS: Record<Exclude<DatasetTopic, "unknown">, string> = {
  cash_flow:
    "Cash flow and banking data: dates, income, expenses, balances, transfers, bank transactions, debits and credits, opening and closing balance.",
  sales:
    "Sales data: orders, customers, products, quantities, revenue, prices, deals, invoices, sales reps, regions, order dates.",
  expenses:
    "Expense and procurement data: suppliers, vendors, cost categories, amounts paid, budgets, purchase orders, receipts.",
  student_grades:
    "Education data: students, courses, subjects, exams, grades, scores, semesters, teachers, classes, attendance.",
  customer_feedback:
    "Customer feedback data: survey responses, ratings, satisfaction scores, NPS, reviews, comments, complaint categories.",
  hr: "Human resources data: employees, departments, roles, salaries, hire dates, attendance, performance reviews, leave days.",
  inventory:
    "Inventory and stock data: products, SKUs, warehouses, stock levels, quantities on hand, reorder points, suppliers.",
  marketing:
    "Marketing data: campaigns, channels, impressions, clicks, conversions, ad spend, leads, CTR, ROI, audiences.",
};

let descriptorVectorsPromise: Promise<Map<DatasetTopic, number[]>> | null =
  null;

async function getDescriptorVectors(): Promise<Map<DatasetTopic, number[]>> {
  if (!descriptorVectorsPromise) {
    descriptorVectorsPromise = (async () => {
      const topics = DATASET_TOPICS.filter(
        (topic): topic is Exclude<DatasetTopic, "unknown"> =>
          topic !== "unknown",
      );
      const vectors = await embedTexts(
        topics.map((topic) => TOPIC_DESCRIPTORS[topic]),
        "passage",
      );
      return new Map(topics.map((topic, index) => [topic, vectors[index]]));
    })();
  }
  return descriptorVectorsPromise;
}

const CONFIDENCE_FLOOR = 0.78;

export async function classifyTopic(
  profileSummary: string,
): Promise<{ topic: DatasetTopic; confidence: number }> {
  try {
    const [queryVector, descriptors] = await Promise.all([
      embedQuery(profileSummary),
      getDescriptorVectors(),
    ]);

    let best: { topic: DatasetTopic; confidence: number } = {
      topic: "unknown",
      confidence: 0,
    };
    for (const [topic, vector] of descriptors) {
      const similarity = cosineSimilarity(queryVector, vector);
      if (similarity > best.confidence) {
        best = { topic, confidence: similarity };
      }
    }

    if (best.confidence < CONFIDENCE_FLOOR) {
      return { topic: "unknown", confidence: best.confidence };
    }
    return best;
  } catch (error) {
    console.error("[topic] classification failed:", error);
    return { topic: "unknown", confidence: 0 };
  }
}
