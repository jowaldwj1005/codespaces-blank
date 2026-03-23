# Dataverse Entity Creation via Power Automate

## Overview

This folder contains JSON arrays designed to be consumed by a Power Automate flow that loops through each item and executes an HTTP action against the Dataverse Web API. This approach allows bulk creation of custom entities, columns, and relationships without manual UI work.

## Why This Approach?

- **Repeatable:** Run the same flow in any environment (dev, test, prod)
- **Ordered:** Entities must exist before lookup columns can reference them
- **Debuggable:** Each item is a single API call — if one fails, you know exactly which one
- **Versionable:** JSON files are in source control, so schema changes are tracked

## File Structure

| File | Phase | What It Does |
|------|-------|-------------|
| `01_tables_and_fields.json` | 1 | Creates all entities + non-lookup columns (text, multiline, boolean, choice, file) |
| `02_lookup_columns.json` | 2 | Adds lookup/FK columns to existing entities (requires Phase 1 + publish first) |
| `03_pac_cli_commands.md` | 3 | PAC CLI commands to generate TypeScript services for the new entities |

## Execution Order (CRITICAL)

```
1. Run Power Automate flow with 01_tables_and_fields.json
2. Go to make.powerapps.com → Solution → Publish All Customizations
3. Run Power Automate flow with 02_lookup_columns.json
4. Publish All Customizations again
5. Run pac code add commands from 03_pac_cli_commands.md
```

**Why publish between phases?**
Lookup columns reference target entities. If the target entity hasn't been published yet, the lookup creation will fail with "Entity not found."

## Power Automate Flow Design

### Flow Structure
1. **Trigger:** Manual / Button
2. **Compose:** Paste the JSON array content
3. **Apply to Each:** Loop through the array
4. **HTTP with Azure AD:** Execute each item

### HTTP Action Configuration
- **Base URL:** `https://<your-org>.crm.dynamics.com/` (your Dataverse org URL)
- **URI:** `@{items('Apply_to_each')?['uri']}`
- **Method:** `@{items('Apply_to_each')?['method']}`
- **Headers:** `@{items('Apply_to_each')?['headers']}`
- **Body:** `@{items('Apply_to_each')?['body']}`

### Authentication
Use "HTTP with Azure AD" connector (pre-authenticated) or "HTTP" action with OAuth bearer token.
Resource URL: `https://<your-org>.crm.dynamics.com/`

## JSON Item Format

Each item in the arrays follows this structure:
```json
{
  "description": "Human-readable description of what this creates",
  "uri": "api/data/v9.2/EntityDefinitions",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "MSCRM.SolutionUniqueName": "YourSolutionName"
  },
  "body": { ... }
}
```

### Key Fields
- `description` — Not sent to API, just for documentation/debugging in the flow
- `uri` — Relative path from org base URL
- `method` — Always POST for creation
- `headers.MSCRM.SolutionUniqueName` — **Replace** `"YourSolutionName"` with your actual solution unique name

## Adding New Entities Later

When you need to add more entities to the data model:

### 1. Define the Schema
Add the entity definition to `ContextFiles/Data Model Blueprint.md` following the existing format.

### 2. Create the JSON Items
For each new entity, you need:

**a) Table creation item:**
```json
{
  "description": "Create <EntityName> table",
  "uri": "api/data/v9.2/EntityDefinitions",
  "method": "POST",
  "headers": { "Content-Type": "application/json", "MSCRM.SolutionUniqueName": "YourSolutionName" },
  "body": {
    "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
    "SchemaName": "jw_newentity",
    "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "New Entity", "LanguageCode": 1033 }] },
    "DisplayCollectionName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "New Entities", "LanguageCode": 1033 }] },
    "HasNotes": false,
    "HasActivities": false,
    "OwnershipType": "UserOwned",
    "IsActivity": false,
    "Attributes": [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",
        "SchemaName": "jw_name",
        "RequiredLevel": { "Value": "ApplicationRequired" },
        "MaxLength": 200,
        "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Name", "LanguageCode": 1033 }] },
        "IsPrimaryName": true
      }
    ]
  }
}
```

**b) Column creation items (one per non-lookup field):**

| Dataverse Type | @odata.type | Key Properties |
|---|---|---|
| Single Line of Text | `StringAttributeMetadata` | `MaxLength: 200`, `FormatName: { Value: "Text" }` |
| Multiline Text | `MemoAttributeMetadata` | `MaxLength: 1048576` (for JSON), `Format: "Text"` |
| Yes/No (Boolean) | `BooleanAttributeMetadata` | `DefaultValue: false` |
| Choice | `PicklistAttributeMetadata` | `OptionSet.Options[]` with values starting at 100000000 |
| File | `FileAttributeMetadata` | `MaxSizeInKB: 131072` (128 MB) |

Column creation URI pattern:
```
api/data/v9.2/EntityDefinitions(LogicalName='jw_newentity')/Attributes
```

**c) Lookup creation items (separate phase, after publish):**
```json
{
  "uri": "api/data/v9.2/RelationshipDefinitions",
  "method": "POST",
  "body": {
    "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",
    "SchemaName": "jw_newentity_parententity",
    "ReferencedEntity": "jw_parententity",
    "ReferencingEntity": "jw_newentity",
    "Lookup": {
      "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",
      "SchemaName": "jw_parententityid",
      "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{ "Label": "Parent Entity", "LanguageCode": 1033 }] },
      "RequiredLevel": { "Value": "None" }
    }
  }
}
```

### 3. Run the Flow
1. Add table + column items to `01_tables_and_fields.json` (or a new file)
2. Publish
3. Add lookup items to `02_lookup_columns.json` (or a new file)
4. Publish

### 4. Wire Up in Code
Follow the checklist in `docs/memory/DATAVERSE_PATTERNS.md` → "Adding a New Table":
1. `pac code add -t jw_newentity`
2. Register in `sdk.ts` TABLES
3. Add CRUD in `dataverse.ts`
4. Add hook in `useDataverse.ts`
5. Register in DataverseExplorer
6. Update CLAUDE.md

## Common Gotchas

- **Solution name:** Always include `MSCRM.SolutionUniqueName` header, or entities land in the Default solution
- **Primary name:** Every entity MUST have exactly one `IsPrimaryName: true` attribute in the creation body
- **Choice values:** Start at 100000000 (Dataverse convention for custom options)
- **Multiline max length:** Set to 1048576 for JSON payload fields, default is only 2000
- **Lookup order:** Target entity must exist AND be published before creating a lookup to it
- **File columns:** Use `FileAttributeMetadata` — supports up to 128 MB per file
