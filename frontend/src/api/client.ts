import axios from 'axios';

const token = localStorage.getItem('token');

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Authorization: token ? `Bearer ${token}` : '',
  },
});
</content>
<task_progress>
- [x] Identify AI service root cause (missing .env + misleading error)
- [x] Diagnose CSV upload failure (missing multipart boundary / content-type)
- [x] Fix client.ts global Content-Type
- [ ] Fix App.tsx multipart header
- [ ] Rebuild frontend
- [ ] Verify end-to-end
</task_progress>
</write_to_file>
