import * as cdk from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, FargateService, FargateTaskDefinition, LogDrivers } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancer, ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class MolamaOnAwsEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'app-vpc', {});
    const cluster = new Cluster(this, 'cluster', {vpc});

    const taskDefinition = new FargateTaskDefinition(this, 'molama-taskDef', {
      cpu: 8192,
      memoryLimitMiB: 16384,
    });

    const molamaContainer = taskDefinition.addContainer('molama', {
      containerName: 'molama',
      image: ContainerImage.fromRegistry('smislam/molama:llama3'),
      portMappings: [{
        containerPort: 11434,
        hostPort: 11434
      }],
      logging: LogDrivers.awsLogs({streamPrefix: 'molama-service', logRetention: RetentionDays.ONE_DAY})
    });

    const uiContainer = taskDefinition.addContainer('open-webui', {
      containerName: 'open-webui',
      image: ContainerImage.fromRegistry('ghcr.io/open-webui/open-webui:main'),
      cpu: 256,
      memoryLimitMiB: 512,
      portMappings: [{
        containerPort: 8080,
        hostPort: 8080,
      }],
      environment: {
        OLLAMA_BASE_URL: 'http://localhost:11434',
        OLLAMA_URL: 'http://localhost:11434'
      },
      logging: LogDrivers.awsLogs({streamPrefix: 'open-webui-service', logRetention: RetentionDays.ONE_DAY})
    });

    const molamaService = new FargateService(this, 'molama-service', {
      cluster,
      taskDefinition
    });

    const alb = new ApplicationLoadBalancer(this, 'molama-alb', {
      vpc,
      internetFacing: true
    });

    const listener = alb.addListener('molama-listener', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
    });

    listener.addTargets('molama-target', {
      port: 80,
      targets: [molamaService.loadBalancerTarget({
        containerName: uiContainer.containerName,
        containerPort: 8080
      })],
      protocol: ApplicationProtocol.HTTP,
      healthCheck: {
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
        timeout: cdk.Duration.seconds(20),
        interval: cdk.Duration.seconds(30)
      }
    });

    new cdk.CfnOutput(this, 'alb-url', {
      value: alb.loadBalancerDnsName,
      exportName: 'molama-stack-loadBalancerDnsName'
    });
  }
}
