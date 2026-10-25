FROM python:3.13-alpine
WORKDIR /app
COPY --chown=10001:10001 public ./public
COPY --chown=10001:10001 server.py .
USER 10001:10001
EXPOSE 8080
ENV HOST=0.0.0.0 PORT=8080 PYTHONDONTWRITEBYTECODE=1
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 CMD ["python3","-c","import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=2).read()"]
CMD ["python3","server.py"]
