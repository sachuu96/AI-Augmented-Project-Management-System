module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
    roots: ["<rootDir>/tests"],
    moduleNameMapper: {
      "^kafkajs$": "<rootDir>/__mocks__/kafkajs.ts",
      "^@aws-sdk/client-dynamodb$": "<rootDir>/__mocks__/@aws-sdk/client-dynamodb.ts",
      "^@aws-sdk/client-s3$": "<rootDir>/__mocks__/@aws-sdk/client-s3.ts",
    },
  };
  