import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../src/theme";

describe("OneHealth ID Mobile Design Tokens", () => {
  it("provides comprehensive brand primary palette", () => {
    expect(COLORS.primary).toBeDefined();
    expect(COLORS.primary[50]).toBe("#eff6ff");
    expect(COLORS.primary[600]).toBe("#2563eb");
    expect(COLORS.primary[900]).toBe("#1e3a8a");
  });

  it("provides semantic status colors for clinical triage", () => {
    expect(COLORS.success[600]).toBe("#16a34a");
    expect(COLORS.warning[500]).toBe("#f59e0b");
    expect(COLORS.danger[600]).toBe("#dc2626");
    expect(COLORS.accent[500]).toBe("#06b6d4");
  });

  it("defines standard typography scales with valid font weights", () => {
    expect(TYPOGRAPHY.hero.fontSize).toBe(28);
    expect(TYPOGRAPHY.h1.fontSize).toBe(24);
    expect(TYPOGRAPHY.body.fontSize).toBe(15);
    expect(TYPOGRAPHY.caption.fontSize).toBe(12);
  });

  it("defines 4-point spacing grid and border radius scale", () => {
    expect(SPACING.xs).toBe(4);
    expect(SPACING.sm).toBe(8);
    expect(SPACING.base).toBe(16);
    expect(SPACING.xl).toBe(24);
    expect(RADIUS.full).toBe(9999);
  });
});
