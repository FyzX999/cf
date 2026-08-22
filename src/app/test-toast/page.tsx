"use client";

import { useToast } from "@/components/ToastProvider";

export default function TestToastPage() {
  const { show } = useToast();

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Toast Notification Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() =>
            show({
              type: "success",
              message: "Operation completed successfully!",
            })
          }
          className="btn btn-primary"
        >
          Show Success Toast
        </button>

        <button
          onClick={() =>
            show({
              type: "error",
              message: "An error occurred while processing your request.",
            })
          }
          className="btn bg-red-600 hover:bg-red-700 text-white"
        >
          Show Error Toast
        </button>

        <button
          onClick={() =>
            show({
              type: "warning",
              message: "Warning: This action cannot be undone.",
            })
          }
          className="btn bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          Show Warning Toast
        </button>

        <button
          onClick={() =>
            show({
              type: "info",
              message: "Here's some helpful information for you.",
            })
          }
          className="btn bg-blue-600 hover:bg-blue-700 text-white"
        >
          Show Info Toast
        </button>

        <button
          onClick={() => {
            show({ type: "success", message: "First toast!" });
            setTimeout(() => show({ type: "info", message: "Second toast!" }), 300);
            setTimeout(() => show({ type: "warning", message: "Third toast!" }), 600);
            setTimeout(() => show({ type: "error", message: "Fourth toast!" }), 900);
          }}
          className="btn btn-ghost col-span-full"
        >
          Show Multiple Toasts (Test Stacking)
        </button>

        <button
          onClick={() =>
            show({
              type: "success",
              message: "This toast will not auto-dismiss.",
              duration: 0,
            })
          }
          className="btn btn-ghost"
        >
          Show Persistent Toast
        </button>

        <button
          onClick={() =>
            show({
              type: "info",
              message: "This toast cannot be manually dismissed.",
              dismissible: false,
              duration: 3000,
            })
          }
          className="btn btn-ghost"
        >
          Show Non-Dismissible Toast
        </button>
      </div>

      <div className="mt-12 p-6 glass">
        <h2 className="text-xl font-bold mb-4">Toast Notification Features</h2>
        <ul className="space-y-2 text-muted">
          <li>✅ Four types: success, error, warning, info</li>
          <li>✅ Color-coded backgrounds and icons</li>
          <li>✅ Auto-dismiss after 5 seconds (configurable)</li>
          <li>✅ Manual dismiss button</li>
          <li>✅ Vertical stacking for multiple toasts</li>
          <li>✅ Slide-in animation from right</li>
          <li>✅ Accessible with ARIA labels</li>
        </ul>
      </div>
    </div>
  );
}
