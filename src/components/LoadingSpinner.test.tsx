/**
 * LoadingSpinner Component Tests
 * 
 * Unit tests for the LoadingSpinner component
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingSpinner } from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  it("should render with default message", () => {
    render(<LoadingSpinner />);
    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("should render with custom message", () => {
    render(<LoadingSpinner message="Loading tickets..." />);
    expect(screen.getByText("Loading tickets...")).toBeDefined();
  });

  it("should apply custom className", () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    const element = container.querySelector(".custom-class");
    expect(element).toBeDefined();
  });

  it("should render spinner element", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeDefined();
  });

  it("should have centered layout", () => {
    const { container } = render(<LoadingSpinner />);
    const wrapper = container.querySelector(".text-center");
    expect(wrapper).toBeDefined();
  });
});
