import Fastify from 'fastify';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';
// @ts-ignore r58 is an idiot and didnt include fucking types
import { epoxyPath } from '@mercuryworkshop/epoxy-transport';
import http from "node:http";
import { refluxPath } from '../lib/index.cjs';
import { scramjetPath } from '@mercuryworkshop/scramjet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendPath = join(__dirname, 'public');

const server = Fastify({
    logger: false,
    serverFactory: handler => {
        const httpServer = http.createServer(handler);

        return httpServer;
    }
});

await server.register(fastifyStatic, {
    root: epoxyPath,
    prefix: '/epoxy/',
    decorateReply: false
});

await server.register(fastifyStatic, {
    root: baremuxPath,
    prefix: '/baremux/',
    decorateReply: false
});

await server.register(fastifyStatic, {
    root: refluxPath,
    prefix: '/reflux/',
    decorateReply: false
});

await server.register(fastifyStatic, {
    root: scramjetPath,
    prefix: '/scram/',
    decorateReply: false
});


await server.register(fastifyStatic, {
    root: frontendPath,
    prefix: '/',
    index: ['index.html'],
    extensions: ['html']
});

const PORT: number = Number(process.env.PORT) || 8080;

server.listen({ port: PORT, host: '0.0.0.0' }, error => {
    if (error) {
        server.log.error(error);
        process.exit(1);
    }
    console.log(`Demo on http://localhost:${PORT}`);
});