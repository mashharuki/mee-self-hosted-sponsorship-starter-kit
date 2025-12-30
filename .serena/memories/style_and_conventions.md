# Code Style and Conventions

## TypeScript Configuration
- **Target**: ESNext
- **Module System**: ESNext with bundler resolution
- **Strict Mode**: Enabled
- **Notable Settings**:
  - `noFallthroughCasesInSwitch`: true
  - `noUncheckedIndexedAccess`: true
  - `skipLibCheck`: true
  - `verbatimModuleSyntax`: true
  - `allowJs`: true
  - `noEmit`: true (no build output, Bun handles runtime)

## Code Style
Based on the code in index.ts:
- **Interfaces**: PascalCase (e.g., `GasTankConfiguration`, `GasTankInfo`)
- **Constants**: camelCase (e.g., `privateKey`, `gasTankConfigurations`)
- **Naming**: Descriptive names for variables and functions
- **Arrow Functions**: Used for callbacks and async operations
- **Type Safety**: Strict TypeScript typing enforced

## Design Patterns
- **Configuration-driven**: Gas tanks configured through array of configurations
- **Express Router Pattern**: Centralized route definitions
- **Error Handling**: Try-catch blocks with JSON error responses
- **Async/Await**: Modern asynchronous code style

## API Standards (Must Follow)
1. All API endpoint URLs must be exactly the same as examples to be compatible with MEE stack
2. All request and response structures must match examples for MEE stack compatibility
3. Error handling and error responses must be consistent with examples
