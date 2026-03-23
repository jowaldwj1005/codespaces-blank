/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "cr_5fcustcon_5fazuredocint_5fe435f80a6d4c3504": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "AnalyzeDocument": {
        "path": "/{connectionId}/documentModels/prebuilt-layout:analyze",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "api-version",
            "in": "query",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "outputContentFormat",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "features",
            "in": "query",
            "required": false,
            "type": "string"
          }
        ],
        "responseInfo": {
          "202": {
            "type": "void"
          }
        }
      },
      "GetAnalyzeResult": {
        "path": "/{connectionId}/documentModels/prebuilt-layout/analyzeResults/{resultId}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "api-version",
            "in": "query",
            "required": true,
            "type": "string"
          },
          {
            "name": "resultId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          }
        }
      }
    }
  },
  "cr_5fcustcon_5fsap_5fodata_5fe435f80a6d4c3504": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "ExecuteSapODataRequest": {
        "path": "/{connectionId}/",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "api-version",
            "in": "query",
            "required": true,
            "type": "string"
          },
          {
            "name": "sp",
            "in": "query",
            "required": true,
            "type": "string"
          },
          {
            "name": "sv",
            "in": "query",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "default": {
            "type": "object"
          }
        }
      }
    }
  },
  "cr_5fcustomconnector_5fazureopenai_5fe435f80a6d4c3504": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "chat-completion": {
        "path": "/{connectionId}/",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "api-version",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": false,
            "type": "object"
          }
        ],
        "responseInfo": {
          "default": {
            "type": "object"
          }
        }
      }
    }
  },
  "jw_agents": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_agentid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "jw_agenttools": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_agenttoolid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "jw_artifacts": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_artifactid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "businessunits": {
    "tableId": "",
    "version": "",
    "primaryKey": "businessunitid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "jw_cases": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_caseid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "jw_documents": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_documentid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "jw_instructions": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_instructionid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "jw_messages": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_messageid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "annotations": {
    "tableId": "",
    "version": "",
    "primaryKey": "annotationid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "jw_playbooks": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_playbookid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "teams": {
    "tableId": "",
    "version": "",
    "primaryKey": "teamid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "jw_threadcases": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_threadcaseid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "jw_threads": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_threadid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "jw_tools": {
    "tableId": "",
    "version": "",
    "primaryKey": "jw_toolid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "systemusers": {
    "tableId": "",
    "version": "",
    "primaryKey": "systemuserid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "webcontents": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "GetFileContent": {
        "path": "/{connectionId}/GetFileContent",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "path",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "string",
            "format": "binary"
          },
          "default": {
            "type": "object"
          }
        }
      },
      "InvokeHttp": {
        "path": "/{connectionId}/codeless/InvokeHttp",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "request",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "default": {
            "type": "object"
          }
        }
      }
    }
  }
};
