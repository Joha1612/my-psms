# mysql/Dockerfile
FROM mysql:8.0
ENV MYSQL_ROOT_PASSWORD=root
ENV MYSQL_DATABASE=psm
COPY schema.sql /docker-entrypoint-initdb.d/
COPY seed.sql /docker-entrypoint-initdb.d/
