"""Refresh public GitHub activity without storing credentials or account names."""

from pathlib import Path
import datetime as dt
import json
import os
import re
import subprocess
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
USERNAME = os.environ.get("PROFILE_USERNAME", "ctrl-pt")
QUERY = """
query($login: String!) {
  user(login: $login) {
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      totalCount
      nodes {
        name
        url
        description
        stargazerCount
        forkCount
        primaryLanguage { name color }
        languages(first: 20) { edges { size node { name color } } }
      }
    }
  }
}
"""


def request(url, token, payload=None):
    headers = {
        "User-Agent": "ctrl-pt-profile-refresh",
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
    }
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def main():
    if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})", USERNAME):
        raise SystemExit("PROFILE_USERNAME must be a GitHub account login.")
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise SystemExit("GITHUB_TOKEN is required to refresh contribution data.")

    account = request("https://api.github.com/users/" + USERNAME, token)
    response = request(
        "https://api.github.com/graphql",
        token,
        {"query": QUERY, "variables": {"login": USERNAME}},
    )
    if response.get("errors"):
        raise RuntimeError("GitHub contribution query failed; existing data was preserved.")
    user = response.get("data", {}).get("user")
    if user is None:
        raise RuntimeError("GitHub account was not found; existing data was preserved.")
    # The public profile graph uses UTC. Share its exact parser with the live
    # service instead of mixing authenticated GraphQL timezone boundaries.
    public_request = urllib.request.Request(
        "https://github.com/users/" + USERNAME + "/contributions",
        headers={"User-Agent": "ctrl-pt-profile-refresh", "Accept": "text/html"},
    )
    with urllib.request.urlopen(public_request, timeout=30) as public_response:
        calendar_html = public_response.read().decode("utf-8")
    parsed = subprocess.run(
        ["node", str(ROOT / "scripts" / "parse-calendar.mjs")],
        input=calendar_html, text=True, capture_output=True, check=True,
    )
    calendar = json.loads(parsed.stdout)
    days = [day for week in calendar["weeks"] for day in week]
    if sum(day["contributionCount"] for day in days) != calendar["totalContributions"]:
        raise RuntimeError("GitHub calendar totals disagree; existing data was preserved.")
    if len({day["date"] for day in days}) != len(days):
        raise RuntimeError("GitHub returned duplicate calendar dates; existing data was preserved.")
    data = {
        "snapshot": dt.datetime.now(dt.timezone.utc).date().isoformat(),
        "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "github-public-calendar-and-api",
        "totalContributions": calendar["totalContributions"],
        "originalRepoCount": user["repositories"]["totalCount"],
        "account": {
            "login": account["login"],
            "followers": account["followers"],
            "public_repos": account["public_repos"],
        },
        "weeks": calendar["weeks"],
        "repos": sorted(user["repositories"]["nodes"], key=lambda repo: repo["name"]),
        "range": calendar["range"],
    }
    target = ROOT / "data" / "github.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    temporary.replace(target)
    print("Updated public GitHub activity and contribution data.")


if __name__ == "__main__":
    main()
