# PAC CLI Commands — Add Generated Services for jw_ Entities

Run these commands AFTER entities are created in Dataverse and published.
Execute from the `PlaybookAgent/` directory.

## Prerequisites

1. All 12 jw_ entities created via Power Automate flow (01 + 02 JSON files)
2. Published twice (after tables, after lookups)
3. PAC CLI authenticated: `pac auth create --environment <env-url>`

## Batch 1: Definition Layer
I edited the code so it matches the correct command. 
Whenever checking records with n:n relations I think best practice is to child expand to the n:N table and inside the expand do a select on the value field and a expand up to the other parent to retrieve the related records

pac code add-data-source -a dataverse -t systemuser  
```bash
pac code add-data-source -a dataverse -t jw_agent
pac code add-data-source -a dataverse -t jw_tool
pac code add-data-source -a dataverse -t jw_playbook
pac code add-data-source -a dataverse -t jw_instruction
pac code add-data-source -a dataverse -t jw_agenttool
```

## Batch 2: State Layer

```bash
pac code add-data-source -a dataverse -t jw_case
pac code add-data-source -a dataverse -t jw_artifact
pac code add-data-source -a dataverse -t jw_document
```

## Batch 3: Interaction Layer

```bash
pac code add-data-source -a dataverse -t jw_thread
pac code add-data-source -a dataverse -t jw_threadcase
pac code add-data-source -a dataverse -t jw_message
pac code add-data-source -a dataverse -t jw_toolexecution
```

## After Each Batch

Follow the wiring checklist from `docs/memory/DATAVERSE_PATTERNS.md` → "Adding a New Table":

1. Register in `sdk.ts` TABLES constant
2. Add traced CRUD wrappers in `dataverse.ts`
3. Add hook methods in `useDataverse.ts`
4. Register in DataverseExplorer AVAILABLE_TABLES
5. Update CLAUDE.md data model section
6. Run `npm run build` to verify no type errors

## Entity Summary

| # | Entity | Primary Name Field | Layer |
|---|--------|-------------------|-------|
| 1 | jw_agent | jw_name | Definition |
| 2 | jw_tool | jw_name | Definition |
| 3 | jw_playbook | jw_name | Definition |
| 4 | jw_instruction | jw_name | Definition |
| 5 | jw_agenttool | jw_name | Definition |
| 6 | jw_case | jw_title | State |
| 7 | jw_artifact | jw_name | State |
| 8 | jw_document | jw_name | State |
| 9 | jw_thread | jw_title | Interaction |
| 10 | jw_threadcase | jw_name | Interaction |
| 11 | jw_message | jw_name | Interaction |
| 12 | jw_toolexecution | jw_name | Interaction |
