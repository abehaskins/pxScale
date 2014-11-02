# DOCKER-VERSION 0.10.0

FROM ubuntu:13.10

# install nodejs and npm
COPY . /src
RUN chmod +x /src/*.sh
RUN /src/install.sh
CMD /src/start.sh
EXPOSE 28015