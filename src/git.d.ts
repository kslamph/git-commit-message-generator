/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface Git {
  readonly _path: string;
}

export interface InputBox {
  value: string;
}

export interface Repository {
  readonly inputBox: InputBox;
  readonly rootUri: any; // Using 'any' type for simplicity
  // Add other repository properties as needed
}

export interface API {
  readonly git: Git;
  readonly repositories: Repository[];
  // Add other API properties as needed
}

export interface GitExtension {
  readonly enabled: boolean;
  readonly version: number;
  getAPI(version: number): API;
}