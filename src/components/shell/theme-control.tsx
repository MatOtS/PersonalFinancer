"use client";
import {
  ONE_YEAR_SECONDS,
  parseThemePreference,
  THEME_COOKIE,
  type ThemePreference,
} from "@/domain/theme";
import { useState } from "react";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control";

type ThemeControlProps = {
  initialPreference: ThemePreference;
};

const options: SegmentedOption[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];
export const ThemeControl = ({ initialPreference }: ThemeControlProps) => {
  const [selectedPreference, setSelectedPreference] =
    useState(initialPreference);

  function handleChange(value: string) {
    const parsedValue = parseThemePreference(value);
    setSelectedPreference(parsedValue);
    if (parsedValue !== "system") {
      document.documentElement.dataset.theme = parsedValue;
      document.cookie = `${THEME_COOKIE}=${parsedValue}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    } else {
      delete document.documentElement.dataset.theme;
      document.cookie = `${THEME_COOKIE}=${parsedValue}; path=/; max-age=0`;
    }
  }

  return (
    <SegmentedControl
      name="theme-options"
      label="Cambiar tema"
      options={options}
      value={selectedPreference}
      onChange={handleChange}
    />
  );
};
