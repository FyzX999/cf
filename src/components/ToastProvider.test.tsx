import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./ToastProvider";

/**
 * Test suite for Toast Notification System
 * 
 * **Validates Requirements:**
 * - 21.1: Display green toast for success operations
 * - 21.2: Display red toast for error operations  
 * - 21.3: Auto-dismiss after 5 seconds
 * - 21.4: Include close button for manual dismissal
 * - 21.5: Stack toasts vertically when multiple notifications shown
 */

// Test component that uses the toast hook
function TestComponent() {
  const { show } = useToast();

  return (
    <div>
      <button onClick={() => show({ type: "success", message: "Success message" })}>
        Show Success
      </button>
      <button onClick={() => show({ type: "error", message: "Error message" })}>
        Show Error
      </button>
      <button onClick={() => show({ type: "warning", message: "Warning message" })}>
        Show Warning
      </button>
      <button onClick={() => show({ type: "info", message: "Info message" })}>
        Show Info
      </button>
      <button
        onClick={() =>
          show({ type: "success", message: "Persistent", duration: 0, dismissible: true })
        }
      >
        Show Persistent
      </button>
      <button
        onClick={() => {
          show({ type: "success", message: "First toast" });
          show({ type: "error", message: "Second toast" });
          show({ type: "info", message: "Third toast" });
        }}
      >
        Show Multiple
      </button>
    </div>
  );
}

describe("ToastProvider and Toast System", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should throw error when useToast is used outside ToastProvider", () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      function InvalidComponent() {
        useToast();
        return null;
      }
      render(<InvalidComponent />);
    }).toThrow("useToast must be used within ToastProvider");

    console.error = originalError;
  });

  it("should display success toast with green styling (Requirement 21.1)", async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Success"));

    const toast = await screen.findByRole("alert");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent("Success message");
    
    // Verify green color classes for success
    expect(toast.className).toMatch(/bg-green-600|dark:bg-green-700/);
  });

  it("should display error toast with red styling (Requirement 21.2)", async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Error"));

    const toast = await screen.findByRole("alert");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent("Error message");
    
    // Verify red color classes for error
    expect(toast.className).toMatch(/bg-red-600|dark:bg-red-700/);
  });

  it("should display warning toast with yellow styling", async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Warning"));

    const toast = await screen.findByRole("alert");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent("Warning message");
    
    // Verify yellow color classes for warning
    expect(toast.className).toMatch(/bg-yellow-600|dark:bg-yellow-700/);
  });

  it("should display info toast with blue styling", async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Info"));

    const toast = await screen.findByRole("alert");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent("Info message");
    
    // Verify blue color classes for info
    expect(toast.className).toMatch(/bg-blue-600|dark:bg-blue-700/);
  });

  it("should auto-dismiss toast after 5 seconds (Requirement 21.3)", async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Success"));

    const toast = await screen.findByRole("alert");
    expect(toast).toBeInTheDocument();

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Wait for the exit animation (300ms) and removal
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("should include close button for manual dismissal (Requirement 21.4)", async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Success"));

    const toast = await screen.findByRole("alert");
    const dismissButton = screen.getByLabelText("Dismiss notification");
    
    expect(dismissButton).toBeInTheDocument();

    await user.click(dismissButton);

    // Wait for the exit animation
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("should stack multiple toasts vertically (Requirement 21.5)", async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Multiple"));

    const toasts = await screen.findAllByRole("alert");
    expect(toasts).toHaveLength(3);
    
    expect(toasts[0]).toHaveTextContent("First toast");
    expect(toasts[1]).toHaveTextContent("Second toast");
    expect(toasts[2]).toHaveTextContent("Third toast");

    // Verify they're in a flex column container
    const container = toasts[0].parentElement;
    expect(container?.className).toMatch(/flex-col/);
  });

  it("should support persistent toasts with duration 0", async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Persistent"));

    const toast = await screen.findByRole("alert");
    expect(toast).toBeInTheDocument();

    // Fast-forward 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Toast should still be visible
    expect(toast).toBeInTheDocument();
  });

  it("should support custom durations", async () => {
    const user = userEvent.setup({ delay: null });
    
    function CustomDurationComponent() {
      const { show } = useToast();
      return (
        <button onClick={() => show({ type: "info", message: "Custom", duration: 2000 })}>
          Show Custom
        </button>
      );
    }

    render(
      <ToastProvider>
        <CustomDurationComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Custom"));

    const toast = await screen.findByRole("alert");
    expect(toast).toBeInTheDocument();

    // Fast-forward 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Wait for the exit animation
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("should display appropriate icons for each toast type", async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Test success icon
    await user.click(screen.getByText("Show Success"));
    let toast = await screen.findByRole("alert");
    expect(toast.querySelector("svg")).toBeInTheDocument();

    // Dismiss and test error icon
    await user.click(screen.getByLabelText("Dismiss notification"));
    act(() => vi.advanceTimersByTime(300));

    await user.click(screen.getByText("Show Error"));
    toast = await screen.findByRole("alert");
    expect(toast.querySelector("svg")).toBeInTheDocument();
  });

  it("should have proper ARIA attributes for accessibility", async () => {
    const user = userEvent.setup({ delay: null });
    
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Show Success"));

    const toast = await screen.findByRole("alert");
    expect(toast).toHaveAttribute("role", "alert");

    const container = toast.parentElement;
    expect(container).toHaveAttribute("aria-live", "polite");
    expect(container).toHaveAttribute("aria-atomic", "true");
  });

  it("should cleanup timers on unmount", () => {
    const { unmount } = render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Trigger some toasts
    const showButton = screen.getByText("Show Success");
    userEvent.click(showButton);

    // Unmount should clear all timers without errors
    expect(() => unmount()).not.toThrow();
  });
});
