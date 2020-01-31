const core = require("@actions/core");
const { GitHub, context } = require("@actions/github");
// const * as yaml from 'js-yaml';
// const {Minimatch} from 'minimatch';

async function run() {
  try {
    core.debug("Starting...");
    const token = core.getInput("repo-token", { required: true });

    const prNumber = getPrNumber();
    if (!prNumber) {
      console.log(
        "Could not get pull request number from context, exiting",
      );
      return;
    }
    const client = new GitHub(token);

    core.debug(`fetching changed files for pr #${prNumber}`);
    const changedFiles = await getChangedFiles(client, prNumber);

    let depsChanged = false;
    for (const file of changedFiles) {
      if (file.includes("yarn.lock")) {
        depsChanged = true;
      }
    }

    if (depsChanged) {
      await addLabel(client, prNumber);
    }
  } catch (e) {
    code.error(e);
    code.setFailed(e.message);
  }
}

function getPrNumber() {
  const pullRequest = context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
}

async function getChangedFiles(client, prNumber) {
  const listFilesResponse = await client.pulls.listFiles({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
  });

  const changedFiles = listFilesResponse.data.map(f => f.filename);

  core.debug("found changed files:");
  for (const file of changedFiles) {
    core.debug("  " + file);
  }

  return changedFiles;
}



async function addLabel(client, prNumber) {
  await client.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
    labels: ["deps-updated"],
  });
}

run();
