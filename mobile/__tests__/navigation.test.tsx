import React from "react";
import { render } from "@testing-library/react-native";
import { StatusBadge } from "../src/components/common/StatusBadge";
import { Header } from "../src/components/common/Header";
import { Card } from "../src/components/common/Card";
import { Text } from "react-native";

describe("Mobile Common Components Baseline", () => {
  it("renders StatusBadge with label and custom variant", async () => {
    const { getByText } = await render(
      <StatusBadge label="Verified Facility" variant="VERIFIED" />
    );
    expect(getByText("Verified Facility")).toBeTruthy();
  });

  it("renders Header with title and subtitle", async () => {
    const { getByText } = await render(
      <Header title="Patient Portal" subtitle="Digital Identity" />
    );
    expect(getByText("Patient Portal")).toBeTruthy();
    expect(getByText("Digital Identity")).toBeTruthy();
  });

  it("renders Card container with children", async () => {
    const { getByText } = await render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );
    expect(getByText("Card Content")).toBeTruthy();
  });
});
