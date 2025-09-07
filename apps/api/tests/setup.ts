import dotenv from "dotenv";

// Load test environment variables (optional)
dotenv.config({ path: ".env.test" });

// Silence noisy logs during tests
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});
