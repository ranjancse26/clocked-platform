import type { ICredentialType, INodeProperties } from 'n8n-workflow';
export class ClockedApi implements ICredentialType {
  name = 'clockedApi';
  displayName = 'Clocked API';
  documentationUrl = 'https://clocked.rezolve.ai/docs';
  properties: INodeProperties[] = [
    { displayName: 'API Key', name: 'apiKey', type: 'string', typeOptions: { password: true }, default: '', required: true, description: 'Sent as Authorization: Bearer <key>.' },
    { displayName: 'Base URL', name: 'baseUrl', type: 'string', default: 'https://clocked.rezolve.ai/clocked', required: true, description: 'Base URL without the operation path.' }
  ];
}
