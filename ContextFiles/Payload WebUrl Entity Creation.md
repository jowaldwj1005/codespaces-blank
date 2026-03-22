[  
  {  
    "description": "1. Create Parent Entity: meta_agent",  
    "method": "POST",  
    "uri": "/api/data/v9.2/EntityDefinitions",  
    "headers": { "Content-Type": "application/json" },  
    "body": {  
      "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",  
      "SchemaName": "meta_agent",  
      "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Agent", "LanguageCode": 1033 } ] },  
      "DisplayCollectionName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Agents", "LanguageCode": 1033 } ] },  
      "OwnershipType": "UserOwned",  
      "IsActivity": false  
    }  
  },  
  {  
    "description": "2. Create Parent Entity: meta_case",  
    "method": "POST",  
    "uri": "/api/data/v9.2/EntityDefinitions",  
    "headers": { "Content-Type": "application/json" },  
    "body": {  
      "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",  
      "SchemaName": "meta_case",  
      "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Case", "LanguageCode": 1033 } ] },  
      "DisplayCollectionName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Cases", "LanguageCode": 1033 } ] },  
      "OwnershipType": "UserOwned",  
      "IsActivity": false  
    }  
  },  
  {  
    "description": "3. Create Child Entity: meta_thread",  
    "method": "POST",  
    "uri": "/api/data/v9.2/EntityDefinitions",  
    "headers": { "Content-Type": "application/json" },  
    "body": {  
      "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",  
      "SchemaName": "meta_thread",  
      "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Thread", "LanguageCode": 1033 } ] },  
      "DisplayCollectionName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Threads", "LanguageCode": 1033 } ] },  
      "OwnershipType": "UserOwned",  
      "IsActivity": false  
    }  
  },  
  {  
    "description": "4. Create Child Entity: meta_artifact",  
    "method": "POST",  
    "uri": "/api/data/v9.2/EntityDefinitions",  
    "headers": { "Content-Type": "application/json" },  
    "body": {  
      "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",  
      "SchemaName": "meta_artifact",  
      "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Artifact", "LanguageCode": 1033 } ] },  
      "DisplayCollectionName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Artifacts", "LanguageCode": 1033 } ] },  
      "OwnershipType": "UserOwned",  
      "IsActivity": false  
    }  
  },  
  {  
    "description": "5. INTERMEDIATE PUBLISH: Crucial for Dataverse to cache the new entities before creating relationships",  
    "method": "POST",  
    "uri": "/api/data/v9.2/PublishAllXml",  
    "headers": { "Content-Type": "application/json" },  
    "body": {}  
  },  
  {  
    "description": "6. Create Attribute: meta_type (String) on meta_artifact",  
    "method": "POST",  
    "uri": "/api/data/v9.2/EntityDefinitions(LogicalName='meta_artifact')/Attributes",  
    "headers": { "Content-Type": "application/json" },  
    "body": {  
      "@odata.type": "Microsoft.Dynamics.CRM.StringAttributeMetadata",  
      "SchemaName": "meta_type",  
      "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Artifact Type", "LanguageCode": 1033 } ] },  
      "MaxLength": 100,  
      "FormatName": { "Value": "Text" }  
    }  
  },  
  {  
    "description": "7. Create Attribute: meta_payload (JSON/Memo) on meta_artifact",  
    "method": "POST",  
    "uri": "/api/data/v9.2/EntityDefinitions(LogicalName='meta_artifact')/Attributes",  
    "headers": { "Content-Type": "application/json" },  
    "body": {  
      "@odata.type": "Microsoft.Dynamics.CRM.MemoAttributeMetadata",  
      "SchemaName": "meta_payload",  
      "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "JSON Payload", "LanguageCode": 1033 } ] },  
      "Format": "TextArea",  
      "MaxLength": 1048576  
    }  
  },  
  {  
    "description": "8. Create Relationship/Lookup: Thread -> Agent (N:1)",  
    "method": "POST",  
    "uri": "/api/data/v9.2/Relationships",  
    "headers": { "Content-Type": "application/json" },  
    "body": {  
      "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",  
      "SchemaName": "meta_agent_meta_thread",  
      "ReferencedEntity": "meta_agent",  
      "ReferencingEntity": "meta_thread",  
      "Lookup": {  
        "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",  
        "SchemaName": "meta_agentid",  
        "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Primary Agent", "LanguageCode": 1033 } ] }  
      },  
      "CascadeConfiguration": {  
        "Assign": "NoCascade",  
        "Delete": "RemoveLink",  
        "Merge": "NoCascade",  
        "Reparent": "NoCascade",  
        "Share": "NoCascade",  
        "Unshare": "NoCascade"  
      }  
    }  
  },  
  {  
    "description": "9. Create Relationship/Lookup: Artifact -> Case (N:1)",  
    "method": "POST",  
    "uri": "/api/data/v9.2/Relationships",  
    "headers": { "Content-Type": "application/json" },  
    "body": {  
      "@odata.type": "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata",  
      "SchemaName": "meta_case_meta_artifact",  
      "ReferencedEntity": "meta_case",  
      "ReferencingEntity": "meta_artifact",  
      "Lookup": {  
        "@odata.type": "Microsoft.Dynamics.CRM.LookupAttributeMetadata",  
        "SchemaName": "meta_caseid",  
        "DisplayName": { "@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [ { "Label": "Linked Case", "LanguageCode": 1033 } ] }  
      },  
      "CascadeConfiguration": {  
        "Assign": "NoCascade",  
        "Delete": "Cascade",  
        "Merge": "NoCascade",  
        "Reparent": "NoCascade",  
        "Share": "NoCascade",  
        "Unshare": "NoCascade"  
      }  
    }  
  },  
  {  
    "description": "10. FINAL PUBLISH: Commit all fields and relationships",  
    "method": "POST",  
    "uri": "/api/data/v9.2/PublishAllXml",  
    "headers": { "Content-Type": "application/json" },  
    "body": {}  
  }  
]

