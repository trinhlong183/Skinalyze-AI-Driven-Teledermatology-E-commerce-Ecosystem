import { Test, TestingModule } from '@nestjs/testing';
import { SpecializationsService } from './specializations.service';

describe('SpecializationsService', () => {
  let service: SpecializationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpecializationsService],
    }).compile();

    service = module.get<SpecializationsService>(SpecializationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
