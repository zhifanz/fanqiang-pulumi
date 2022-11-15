import { AnalyzerConstructFunction } from "../../domain/RuleAnalyzer";

export class NoOpAnalyzer {
  apply: AnalyzerConstructFunction = () => {};
}
