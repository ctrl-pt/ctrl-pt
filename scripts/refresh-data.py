"""Refresh public GitHub activity without storing credentials or account names."""

from pathlib import Path
import datetime as dt
import json
import os
import re
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
USERNAME = os.environ.get("PROFILE_USERNAME", "ctrl-pt")
QUERY = """
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      startedAt
      endedAt
      contributionCalendar {
        weeks {
          contributionDays { date contributionCount weekday }
        }
      }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
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
    collection = user["contributionsCollection"]
    data = {
        "snapshot": dt.datetime.now(dt.timezone.utc).date().isoformat(),
        "account": {
            "login": account["login"],
            "followers": account["followers"],
            "public_repos": account["public_repos"],
        },
        "weeks": [
            week["contributionDays"]
            for week in collection["contributionCalendar"]["weeks"]
        ],
        "repos": sorted(user["repositories"]["nodes"], key=lambda repo: repo["name"]),
        "range": [collection["startedAt"], collection["endedAt"]],
    }
    target = ROOT / "data" / "github.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    temporary.replace(target)
    print("Updated public GitHub activity and contribution data.")


if __name__ == "__main__":
    main()
