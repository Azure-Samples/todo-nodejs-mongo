// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
    AccessToken,
    TokenCredential,
} from "@azure/core-auth";
import { CredentialUnavailableError } from "@azure/identity";
import child_process from "child_process";

export class AzureDeveloperCliCredential implements TokenCredential {
    public async getToken(
        scopes: string | string[],
    ): Promise<AccessToken> {
        if (typeof(scopes) === "string") {
            scopes = [scopes];
        }

        try {
            const {stdout, error} = await getAccessTokenFromAzd(scopes);
            if (error) {
                throw new CredentialUnavailableError(`failed to call azd get-access-token: ${error}`);    
            }

            const resp: { token: string, expiresOn: string} = JSON.parse(stdout);

            return {
                token: resp.token,
                expiresOnTimestamp: new Date(resp.expiresOn).getTime()
            };
        } catch (err: unknown) {
            throw new CredentialUnavailableError(`failed to call azd get-access-token: ${err}`);   
        }
    }
}

function getSafeWorkingDir(): string {
    if (process.platform === "win32") {
        if (!process.env.SystemRoot) {
            throw new Error("Azure Developer CLI credential expects a 'SystemRoot' environment variable");
        }
        return process.env.SystemRoot;
    } else {
        return "/bin";
    }
}


function getAccessTokenFromAzd(
    scopes: string[]
): Promise<{ stdout: string; stderr: string; error: Error | null}> {
    const args = ["get-access-token", "--output", "json", ...scopes.flatMap((scope) => ["--scope", scope])];

    return new Promise((resolve, reject) => {
        try {
            child_process.execFile("azd", args, {cwd: getSafeWorkingDir()}, (error, stdout, stderr) => {
                resolve({ stdout, stderr, error });
            });
        } catch (err: unknown) {
            reject(err);
        }
    });
}
