# Publishing this repo to GitHub

This environment's GitHub App token can only access `shankarappan/Project-1` and **cannot create** `shankarappan/mb-live`.

## One-time setup (you)

1. Create a new **public** repository: https://github.com/new  
   - Owner: `shankarappan`  
   - Name: `mb-live`  
   - Do **not** add a README/license (empty repo)

2. Grant the **Cursor** GitHub App access to `mb-live`  
   (GitHub → Settings → Applications → Cursor → Repository access → add `mb-live`)

3. Tell the agent (or run locally):

```bash
cd /path/to/mb-live
git remote add origin https://github.com/shankarappan/mb-live.git
git push -u origin main
```

Or from this cloud machine after access is granted:

```bash
cd /home/ubuntu/mb-live
git remote add origin https://github.com/shankarappan/mb-live.git
git push -u origin main
```
