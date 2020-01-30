const { debug, error, setFailed, getInput } = require('@actions/core');
const {GitHub , context} = require('@actions/github');
// const * as yaml from 'js-yaml';
// const {Minimatch} from 'minimatch';

async function run() {
  try {
    debug(`Starting...`);
    const token = getInput('repo-token', {required: true});

    const prNumber = getPrNumber();
    if (!prNumber) {
      console.log('Could not get pull request number from context, exiting');
      return;
    }
    const client = new GitHub(token);

    debug(`fetching changed files for pr #${prNumber}`);
    const changedFiles = await getChangedFiles(client, prNumber);
    // const labelGlobs = await getLabelGlobs(
    //   client,
    //   configPath
    // );

    // const labels = [];
    // for (const [label, globs] of labelGlobs.entries()) {
    //   debug(`processing ${label}`);
    //   if (checkGlobs(changedFiles, globs)) {
    //     labels.push(label);
    //   }
    // }
    let depsChanged = false
    for (const file of changedFiles) {
      if(file === "yarn.lock"){
        depsChanged = true
      }
    }

    if (depsChanged) {
      await addLabel(client, prNumber);
    }
  } catch (e) {
    error(e);
    setFailed(e.message);
  }
}

function getPrNumber() {
  const pullRequest = context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
}

async function getChangedFiles(
  client,
  prNumber
) {
  const listFilesResponse = await client.pulls.listFiles({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber
  });

  const changedFiles = listFilesResponse.data.map(f => f.filename);

  debug('found changed files:');
  for (const file of changedFiles) {
    debug('  ' + file);
  }

  return changedFiles;
}

// async function getLabelGlobs(
//   client: GitHub,
//   configurationPath: string
// ): Promise<Map<string, string[]>> {
//   const configurationContent: string = await fetchContent(
//     client,
//     configurationPath
//   );

//   // loads (hopefully) a `{[label:string]: string | string[]}`, but is `any`:
//   const configObject: any = yaml.safeLoad(configurationContent);

//   // transform `any` => `Map<string,string[]>` or throw if yaml is malformed:
//   return getLabelGlobMapFromObject(configObject);
// }

// async function fetchContent(
//   client: GitHub,
//   repoPath: string
// ): Promise<string> {
//   const response = await client.repos.getContents({
//     owner: context.repo.owner,
//     repo: context.repo.repo,
//     path: repoPath,
//     ref: context.sha
//   });

//   return Buffer.from(response.data.content, 'base64').toString();
// }

// function getLabelGlobMapFromObject(configObject: any): Map<string, string[]> {
//   const labelGlobs: Map<string, string[]> = new Map();
//   for (const label in configObject) {
//     if (typeof configObject[label] === 'string') {
//       labelGlobs.set(label, [configObject[label]]);
//     } else if (configObject[label] instanceof Array) {
//       labelGlobs.set(label, configObject[label]);
//     } else {
//       throw Error(
//         `found unexpected type for label ${label} (should be string or array of globs)`
//       );
//     }
//   }

//   return labelGlobs;
// }

// function checkGlobs(changedFiles: string[], globs: string[]): boolean {
//   for (const glob of globs) {
//     debug(` checking pattern ${glob}`);
//     const matcher = new Minimatch(glob);
//     for (const changedFile of changedFiles) {
//       debug(` - ${changedFile}`);
//       if (matcher.match(changedFile)) {
//         debug(` ${changedFile} matches`);
//         return true;
//       }
//     }
//   }
//   return false;
// }

async function addLabel(
  client,
  prNumber
) {
  await client.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
    labels: ["deps-updated"]
  });
}

run();