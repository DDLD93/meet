import { NextResponse } from 'next/server';

import openApiDocument from '@/docs/openapi.json';

const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>LiveKit Meet API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f9fafb; }
      #swagger-ui { margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({
          spec: ${JSON.stringify(openApiDocument)},
          dom_id: '#swagger-ui',
          docExpansion: 'list',
          defaultModelsExpandDepth: -1
        });
      };
    </script>
  </body>
</html>
`;

export function GET() {
  return new NextResponse(swaggerHtml, {
    headers: {
      'content-type': 'text/html',
    },
  });
}

