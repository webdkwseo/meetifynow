import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Mock Next.js router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  pathname: "/",
  query: {},
  asPath: "/",
  route: "/",
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock axios
vi.mock("axios");

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: "div",
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Hooks persist drafts/preferences in browser storage; keep tests isolated.
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

// Setup before each test
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});
