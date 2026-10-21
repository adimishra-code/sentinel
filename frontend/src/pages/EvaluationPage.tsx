import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, RefreshCw, BarChart2 } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { evaluationApi } from '../services/api';
import { CanDo } from '../components/CanDo';

export function EvaluationPage() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [threshold, setThreshold] = useState(0.5);
  const [useLLM, setUseLLM] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const runBenchmark = useMutation({
    mutationFn: () => evaluationApi.run({ threshold, useLLM }),
    onSuccess: (data) => {
      setReport(data);
      queryClient.invalidateQueries({ queryKey: ['evaluation-runs'] });
      setRunning(false);
    },
    onError: () => {
      setRunning(false);
    },
  });

  const loadRuns = async () => {
    setRunsLoading(true);
    try {
      const data = await evaluationApi.listRuns();
      setRuns(data?.items ?? []);
    } catch {
      setRuns([]);
    } finally {
      setRunsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-sm font-semibold text-neutral-900">Evaluation Lab</h1>
          <p className="text-body-md text-neutral-500 mt-1">
            Run detection benchmarks to measure precision, recall, and decision accuracy
          </p>
        </div>
        <CanDo roles={['org_admin']}>
          <button
            onClick={() => {
              setRunning(true);
              runBenchmark.mutate();
            }}
            disabled={runBenchmark.isPending || running}
            className="btn-primary btn-md"
          >
            <Play className="w-4 h-4 mr-2" />
            {running ? 'Running...' : 'Run Benchmark'}
          </button>
        </CanDo>
      </div>

      {/* Run controls */}
      <CanDo roles={['org_admin']}>
        <Card className="p-5">
          <CardHeader>
            <h2 className="text-heading-md font-semibold text-neutral-900">Configure Benchmark</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-body-sm font-medium text-neutral-700 mb-2">
                  Risk Score Threshold
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-caption text-neutral-500 mt-1">
                  <span>0.0</span>
                  <span>{threshold.toFixed(2)}</span>
                  <span>1.0</span>
                </div>
              </div>
              <div>
                <label className="block text-body-sm font-medium text-neutral-700 mb-2">
                  Include LLM path
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useLLM}
                    onChange={(e) => setUseLLM(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Use Gemini LLM (slower, higher cost)</span>
                </label>
              </div>
              <div className="flex items-end">
                <p className="text-caption text-neutral-500">
                  Heuristics only: ~0.0001 per 1,000 items
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </CanDo>

      {/* Results */}
      {report && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <h3 className="text-caption text-neutral-500 uppercase tracking-wider mb-2">
                Flagged Accuracy
              </h3>
              <p className="text-display-sm font-semibold text-neutral-900">
                {(report.flagged?.accuracy ?? 0) * 100}%
              </p>
              <p className="text-caption text-neutral-500 mt-2">
                F1: {report.flagged?.f1?.toFixed(3)} | FPR: {report.flagged?.false_positive_rate?.toFixed(3)}
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="text-caption text-neutral-500 uppercase tracking-wider mb-2">
                Decision Accuracy
              </h3>
              <p className="text-display-sm font-semibold text-neutral-900">
                {(report.decisionAccuracy?.accuracy ?? 0) * 100}%
              </p>
              <p className="text-caption text-neutral-500 mt-2">
                {report.decisionAccuracy?.correct}/{report.decisionAccuracy?.total}
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="text-caption text-neutral-500 uppercase tracking-wider mb-2">
                Latency p95
              </h3>
              <p className="text-display-sm font-semibold text-neutral-900">
                {report.latencyMs?.p95 ?? 0} ms
              </p>
              <p className="text-caption text-neutral-500 mt-2">
                Mean: {report.latencyMs?.mean ?? 0} ms
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="text-caption text-neutral-500 uppercase tracking-wider mb-2">
                Cost per 1k
              </h3>
              <p className="text-display-sm font-semibold text-neutral-900">
                ${report.costPer1kItems ?? 0}
              </p>
              <p className="text-caption text-neutral-500 mt-2">
                {report.path}
              </p>
            </Card>
          </div>

          {/* Category table */}
          <Card className="p-0">
            <CardHeader>
              <h2 className="text-heading-md font-semibold text-neutral-900">Per-Category Metrics</h2>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>F1</th>
                      <th>TP</th>
                      <th>FP</th>
                      <th>FN</th>
                      <th>Support</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categories?.map((cat: any) => (
                      <tr key={cat.category}>
                        <td className="font-mono text-body-sm">{cat.category}</td>
                        <td>{cat.precision?.toFixed(3)}</td>
                        <td>{cat.recall?.toFixed(3)}</td>
                        <td>{cat.f1?.toFixed(3)}</td>
                        <td>{cat.tp}</td>
                        <td>{cat.fp}</td>
                        <td>{cat.fn}</td>
                        <td>{cat.support}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Threshold tuning */}
          <Card className="p-0">
            <CardHeader>
              <h2 className="text-heading-md font-semibold text-neutral-900">Threshold Tuning</h2>
            </CardHeader>
            <CardBody className="p-5">
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Threshold</th>
                      <th>Flagged Accuracy</th>
                      <th>F1</th>
                      <th>False Positive Rate</th>
                      <th>Decision Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.thresholdTuning?.map((t: any) => (
                      <tr key={t.threshold}>
                        <td className="font-mono text-body-sm">{t.threshold}</td>
                        <td>{t.flaggedAccuracy?.toFixed(3)}</td>
                        <td>{t.flaggedF1?.toFixed(3)}</td>
                        <td>{t.falsePositiveRate?.toFixed(3)}</td>
                        <td>{t.decisionAccuracy?.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Run history */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-md font-semibold text-neutral-900">Recent Runs</h2>
          <CanDo roles={['org_admin']}>
            <button
              onClick={loadRuns}
              disabled={runsLoading}
              className="btn-ghost btn-sm flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </CanDo>
        </div>
        {runsLoading ? (
          <div className="py-8 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-brand-500 animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            No benchmark runs yet. Run the benchmark to see results here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Cases</th>
                  <th>Threshold</th>
                  <th>Path</th>
                  <th>Flagged Accuracy</th>
                  <th>Decision Accuracy</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run: any) => (
                  <tr key={run.id}>
                    <td className="font-mono text-body-sm text-neutral-600 truncate max-w-xs">
                      {run.dataset}
                    </td>
                    <td>{run.totalCases}</td>
                    <td>{run.threshold}</td>
                    <td>{run.path}</td>
                    <td>
                      {run.report?.flagged?.accuracy?.toFixed(3)}
                    </td>
                    <td>
                      {run.report?.decisionAccuracy?.accuracy?.toFixed(3)}
                    </td>
                    <td className="text-body-sm text-neutral-500">
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!report && (
        <div className="text-center py-16">
          <BarChart2 className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-heading-md font-medium text-neutral-500">No benchmark results yet</h3>
          <p className="text-body-sm text-neutral-400 mt-2">
            Configure the threshold above and run the benchmark to evaluate detection accuracy.
          </p>
        </div>
      )}
    </div>
  );
}
