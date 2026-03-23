import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SuccessModal } from "@/components/feedback/SuccessModal";
import { LanguageProvider } from "@/context/language-context";

describe("SuccessModal", () => {
  it("shows message and redirects on OK", () => {
    const onClose = vi.fn();

    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route
              path="/"
              element={
                <SuccessModal
                  isOpen
                  onClose={onClose}
                  message="Request approved successfully."
                  redirectPath="/director/dashboard"
                />
              }
            />
            <Route
              path="/director/dashboard"
              element={<div>Director Dashboard</div>}
            />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>,
    );

    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(
      screen.getByText("Request approved successfully."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Director Dashboard")).toBeInTheDocument();
  });
});
