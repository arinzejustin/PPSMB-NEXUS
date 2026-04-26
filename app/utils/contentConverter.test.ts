import test from "node:test";
import assert from "node:assert/strict";
import {
  convertToPrintHTML,
  csvToHTML,
  detectContentType,
  generatePreviewHTML,
} from "./contentConverter.ts";

test("detectContentType identifies csv and excel extensions", () => {
  assert.equal(detectContentType("report.csv"), "csv");
  assert.equal(detectContentType("report.xlsx"), "excel");
  assert.equal(detectContentType("report.xlsm"), "excel");
  assert.equal(detectContentType("report.unknown"), "html");
});

test("csvToHTML wraps table output in html document", () => {
  const html = csvToHTML("name,score\nAda,92", "Scores");
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<table/);
  assert.match(html, /Scores/);
});

test("convertToPrintHTML enforces content type contracts", () => {
  assert.throws(
    () => convertToPrintHTML("not-a-buffer", "excel"),
    /Excel content must be an ArrayBuffer/,
  );

  assert.throws(
    () => convertToPrintHTML(new ArrayBuffer(8), "html"),
    /HTML content must be a string/,
  );
});

test("generatePreviewHTML returns html input unchanged", () => {
  const input = "<div>Hello</div>";
  const preview = generatePreviewHTML(input, "html");
  assert.equal(preview, input);
});
