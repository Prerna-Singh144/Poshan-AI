import { useState } from 'react';
import { Upload } from 'lucide-react';
import { getReport, uploadReport } from '../api/reportApi.js';
import UplinkLoader from '../components/ui/UplinkLoader.jsx';

export default function UploadReport() {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;
    setError('');
    setMessage('Uploading your report…');
    setProcessing(true);
    try {
      const response = await uploadReport(file);
      const report = response?.report ?? response?.data?.report ?? response;
      const reportId = report?.id ?? report?._id;
      if (!reportId) throw new Error('The upload response did not include a report ID.');
      if (report.ocrStatus === 'completed') {
        setMessage('Report processing complete.');
        return;
      }
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        const statusResponse = await getReport(reportId);
        const current = statusResponse?.report ?? statusResponse?.data?.report ?? statusResponse;
        if (current.ocrStatus === 'completed') {
          setMessage('Report processing complete. You can review the results from your dashboard.');
          return;
        }
        if (current.ocrStatus === 'failed') throw new Error('Report processing failed. Please try uploading it again.');
        setMessage(current.ocrStatus === 'processing' ? 'Reading your report…' : 'Waiting for secure processing…');
      }
      throw new Error('Report processing is taking longer than expected. Check your dashboard for the latest status.');
    } catch (requestError) {
      setError(requestError.message || 'The report could not be processed. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-labelledby="upload-title">
      <h1 id="upload-title" className="text-3xl font-bold text-slate-900 dark:text-white">Upload report</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">Upload a PDF or image of your report for secure text extraction.</p>
      {processing ? <UplinkLoader label={message} /> : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label htmlFor="report-file" className="block rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/20">
            <Upload className="mx-auto text-leaf" aria-hidden="true" />
            <span className="mt-3 block font-medium text-slate-800 dark:text-slate-100">Choose a report file</span>
            <span className="mt-1 block text-sm text-slate-500">PDF, JPG or PNG · up to 10 MB</span>
            <input id="report-file" className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          {file && <p className="text-sm text-slate-600 dark:text-slate-300">Selected file: {file.name}</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
          <button type="submit" disabled={!file} className="rounded-xl bg-leaf px-5 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">Upload securely</button>
        </form>
      )}
    </section>
  );
}
