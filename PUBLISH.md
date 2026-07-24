# Publishing this repo to GitHub

The MB Live MVP is complete locally at `/home/ubuntu/mb-live` (branch `main`).

This cloud agent’s GitHub App token can only access **`shankarappan/Project-1`** (selected-repos install) and **cannot create** `shankarappan/mb-live`.

## What you need to do once

1. Open https://github.com/new  
   - Owner: **shankarappan**  
   - Repository name: **mb-live**  
   - Visibility: **Public**  
   - Do **not** initialize with README / license / .gitignore (empty repo)

2. Grant the **Cursor** GitHub App access to the new repo:  
   GitHub → Settings → Applications → **Cursor** → Configure → Repository access → add **mb-live**  
   (or choose “All repositories”)

3. Reply in the cloud agent chat: **“repo is ready — push it”**  
   The agent will run:

```bash
cd /home/ubuntu/mb-live
git remote set-url origin https://github.com/shankarappan/mb-live.git
git push -u origin main
```

## Or push from your machine

```bash
# after creating the empty repo
cd /path/to/mb-live   # or extract mb-live-source.tar.gz
git remote add origin https://github.com/shankarappan/mb-live.git
git push -u origin main
```

Source tarball from this run: `/opt/cursor/artifacts/mb-live-source.tar.gz`
