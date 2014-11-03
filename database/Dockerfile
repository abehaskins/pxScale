# DOCKER-VERSION 0.10.0

FROM ubuntu:13.10

# install nodejs and npm
COPY . /src
RUN chmod +x /src/*.sh
RUN cd /src; ./install.sh
CMD cd /src; ./start.sh prod
EXPOSE 28015
EXPOSE 1440