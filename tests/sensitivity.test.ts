import { scanSensitive, summarise } from "../src/domain/sensitivity";
import { EXAMPLES } from "../src/fixtures/examples";

const kinds = (t: string) => [...new Set(scanSensitive(t).map((m) => m.kind))].sort();

describe("scanSensitive", () => {
  it("finds the email, internal host and token in E3", () => {
    expect(kinds(EXAMPLES[2].notes)).toEqual(["email", "internal-host", "jwt"]);
    expect(summarise(scanSensitive(EXAMPLES[2].notes))).toBe("Found an internal URL, an email and a token.");
  });
  it("finds nothing in E1 or a public URL", () => {
    expect(scanSensitive(EXAMPLES[0].notes)).toEqual([]);
    expect(scanSensitive("see https://example.com for details")).toEqual([]);
  });
  it("matches localhost and private IPs", () => {
    expect(kinds("open http://localhost:3000/x")).toEqual(["internal-host"]);
    expect(kinds("server at 10.0.0.12")).toEqual(["ip"]);
  });
  it("matches a 40-char hex string but not a long plain word", () => {
    expect(kinds("key 3f9a1c0b7e6d5a4f3e2d1c0b9a8f7e6d5c4b3a2f")).toEqual(["secret-like"]);
    expect(scanSensitive("supercalifragilisticexpialidociousness_and_more")).toEqual([]);
  });
});
