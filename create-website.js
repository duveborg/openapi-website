import { Octokit } from "@octokit/rest";
import OpenAI from 'openai';
import { config } from 'dotenv';

config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY, 
});

const octokit = new Octokit({
  auth: process.env.GITHUB_KEY,
});

const owner= process.env.OWNER
const repo= process.env.REPO
const path= "index.html"

const parseHtmlFromResponse = (output) => {
  const htmlStart = output.indexOf('<html>');
  const htmlEnd = output.lastIndexOf('</html>') + 7; // 7 is the length of '</html>'
  
  if (htmlStart !== -1 && htmlEnd !== -1) {
    return output.substring(htmlStart, htmlEnd);
  }
 
  throw new Error("No html found")
}

const updateGitHubRepo = async (html) => {
  const content = Buffer.from(html).toString('base64');

  console.log("Fetching current index.html from GitHub")

  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  const sha = data.sha;

  console.log("Updating index.html on GitHub")

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Update index.html`,
      sha,
      content: content,
    });

    console.log(`Success! the website is live within a few minutes at https://${owner}.github.io/${repo}/}`);
  } catch (error) {
    console.error("Error updating GitHub repo: ", error);
  }
};

const generateHtml = async (prompt) => {
  console.log("Sending prompt to OpenAI API")

  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'gpt-4',
  });

  console.log("Received response from OpenAI API")

  const fullMessage = chatCompletion.choices[0].message.content
  const html = parseHtmlFromResponse(fullMessage)
  updateGitHubRepo(html)
}


const prompt = process.argv[2];

if (!prompt) throw new Error("No prompt provided")

generateHtml("Create an index.html with inline styles and scripts with the following content:" + prompt)