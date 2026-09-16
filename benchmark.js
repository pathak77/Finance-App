import http from 'k6/http';
import grpc from 'k6/net/grpc';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const restLatency = new Trend('rest_latency');
const grpcLatency = new Trend('grpc_latency');

const client = new grpc.Client();
client.load(['./ledger-service/src/main/proto'], 'LedgerProto.proto');

export const options = {
    vus: 50,
    duration: '30s',
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default () => {
    
    const restRes = http.get('http://localhost:8080/app/1/ledger/giver/');
    
    check(restRes, {
        'REST status is 200': (r) => r.status === 200,
    });
    restLatency.add(restRes.timings.duration);

   
    client.connect('localhost:9091', { plaintext: true });

    const grpcData = { giverId: 1, page: 0, size: 10, sortBy: 'createdAt', ascending: true };
    const grpcRes = client.invoke('TransactionService.LedgerService/GetTransactionsByGiver', grpcData);

    check(grpcRes, {
        'gRPC status is OK': (r) => r && r.status === grpc.StatusOK,
    });
    
    grpcLatency.add(grpcRes.message_duration || grpcRes.time || 0); 
    
    client.close();

    sleep(0.1); 
};
